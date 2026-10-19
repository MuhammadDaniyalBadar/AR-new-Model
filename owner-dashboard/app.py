"""
Owner dashboard for the 3D & AR menu.

Two kinds of routes:

  Public, called by the menu app on customers' phones (no login):
    POST /api/events            usage events (views, take apart, AR...)
    POST /api/catalog           the restaurant's dish list, so names match
    GET  /api/config/<id>       badges, "not available today" and the banner

  Private, for the restaurant owner (login required):
    /login, /logout
    /dashboard                  numbers and charts
    /promotions                 badges, availability and the banner
    /report                     monthly report, ready to send on WhatsApp

Run locally:  python app.py   (then open http://localhost:5000)
"""
import json
import re
import secrets
from datetime import datetime
from functools import wraps

from flask import Flask, abort, flash, g, jsonify, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash

import config
import db
import report
import stats

app = Flask(__name__)
app.config.update(
    SECRET_KEY=config.SECRET_KEY,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=64 * 1024,  # menu app requests are tiny
)

ID_RE = re.compile(r"^[a-z0-9-]{1,64}$")


def conn():
    if "db" not in g:
        g.db = db.connect()
        db.init(g.db)
    return g.db


@app.teardown_appcontext
def _close(_exc):
    c = g.pop("db", None)
    if c is not None:
        c.close()


@app.template_filter("n")
def _fmt_number(x):
    return f"{x:,}"


@app.template_filter("secs")
def _fmt_secs(x):
    return stats.fmt_seconds(x)


@app.context_processor
def _globals():
    return {"BADGES": config.BADGES, "restaurant": g.get("restaurant")}


# =============================================================== public API

@app.after_request
def _cors(resp):
    # The menu is served from Netlify, a different domain, so allow it to call /api.
    if request.path.startswith("/api/"):
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp


def _body():
    # The app sends JSON as text/plain (navigator.sendBeacon requires a "simple" type).
    try:
        data = json.loads(request.get_data(as_text=True) or "{}")
    except ValueError:
        abort(400, "Body must be JSON")
    if not isinstance(data, dict):
        abort(400, "Body must be a JSON object")
    return data


def _known_restaurant(rid):
    if not isinstance(rid, str) or not ID_RE.match(rid) or not db.get_restaurant(conn(), rid):
        abort(404, "Unknown restaurant")
    return rid


def _clean_id(v):
    return v if isinstance(v, str) and ID_RE.match(v) else None


@app.route("/api/events", methods=["POST", "OPTIONS"])
def api_events():
    if request.method == "OPTIONS":
        return "", 204
    data = _body()
    rid = _known_restaurant(data.get("restaurant"))
    sid = data.get("session")
    if not isinstance(sid, str) or not re.match(r"^[A-Za-z0-9_-]{8,64}$", sid):
        abort(400, "Bad session id")

    now = db.now()
    rows = []
    for e in (data.get("events") or [])[:50]:
        if not isinstance(e, dict) or e.get("type") not in config.EVENT_TYPES:
            continue
        dish_id = _clean_id(e.get("dish"))
        if e["type"] != "menu" and not dish_id:
            continue
        source = e.get("source") if e.get("source") in config.VIEW_SOURCES else None
        value = e.get("value")
        value = float(value) if isinstance(value, (int, float)) and value >= 0 else None
        # Trust the phone's clock only within a day; otherwise use the server's.
        ts = e.get("ts")
        ts = int(ts) if isinstance(ts, (int, float)) and abs(now - ts) < 86400 else now
        rows.append(
            {"restaurant_id": rid, "session_id": sid, "type": e["type"], "dish_id": dish_id,
             "source": source, "value": value, "ts": ts, "demo": 0}
        )
    if rows:
        db.insert_events(conn(), rows)
    return jsonify(saved=len(rows))


@app.route("/api/catalog", methods=["POST", "OPTIONS"])
def api_catalog():
    if request.method == "OPTIONS":
        return "", 204
    data = _body()
    rid = _known_restaurant(data.get("restaurant"))
    dishes = []
    for d in (data.get("dishes") or [])[:300]:
        if isinstance(d, dict) and _clean_id(d.get("id")) and isinstance(d.get("name"), str):
            category = d.get("category") if isinstance(d.get("category"), str) else None
            dishes.append({"id": d["id"], "name": d["name"][:80], "category": (category or "")[:64] or None})
    if dishes:
        db.upsert_dishes(conn(), rid, dishes)
    return jsonify(saved=len(dishes))


@app.get("/api/config/<rid>")
def api_config(rid):
    _known_restaurant(rid)
    c = conn()
    dishes = {
        d["id"]: {"badges": d["badges"], "unavailable": d["unavailable"]}
        for d in db.list_dishes(c, rid)
        if d["badges"] or d["unavailable"]
    }
    resp = jsonify(banner=db.live_banner(c, rid), dishes=dishes, badges=config.BADGES)
    # Short cache: owner changes show up within a minute.
    resp.headers["Cache-Control"] = "public, max-age=60"
    return resp


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(413)
def _api_errors(err):
    if request.path.startswith("/api/"):
        return jsonify(error=err.description), err.code
    return err


# ============================================================== owner pages

def login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        rid = session.get("restaurant")
        r = db.get_restaurant(conn(), rid) if rid else None
        if not r:
            return redirect(url_for("login", next=request.path))
        g.restaurant = r
        return view(*args, **kwargs)

    return wrapper


def _csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(24)
    return session["csrf"]


def _check_csrf():
    expected = session.get("csrf")
    if not expected or not secrets.compare_digest(request.form.get("csrf", ""), expected):
        abort(400, "Form expired. Please try again.")


app.jinja_env.globals["csrf_token"] = _csrf_token


@app.get("/")
def home():
    return redirect(url_for("dashboard"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        rid = request.form.get("restaurant", "").strip().lower()
        r = db.get_restaurant(conn(), rid) if ID_RE.match(rid) else None
        if r and check_password_hash(r["password_hash"], request.form.get("password", "")):
            session.clear()
            session["restaurant"] = rid
            nxt = request.args.get("next", "")
            return redirect(nxt if nxt.startswith("/") and not nxt.startswith("//") else url_for("dashboard"))
        flash("That restaurant ID and password don't match.")
    return render_template("login.html")


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


PERIODS = {"7": 7, "30": 30, "90": 90}


@app.get("/dashboard")
@login_required
def dashboard():
    days = PERIODS.get(request.args.get("days", "30"), 30)
    period = stats.last_days(days)
    s = stats.compute(conn(), g.restaurant["id"], period, compare_to=period.previous())
    return render_template("dashboard.html", s=s, days=days, periods=PERIODS)


@app.route("/promotions", methods=["GET", "POST"])
@login_required
def promotions():
    c = conn()
    rid = g.restaurant["id"]
    dishes = db.list_dishes(c, rid)

    if request.method == "POST":
        _check_csrf()
        for d in dishes:
            db.save_dish_settings(
                c, rid, d["id"],
                badges=request.form.getlist(f"badge-{d['id']}"),
                unavailable=request.form.get(f"unavailable-{d['id']}") == "on",
            )
        banner_dish = request.form.get("banner_dish") or None
        db.save_banner(
            c, rid,
            text=request.form.get("banner_text", "").strip()[:120],
            dish_id=banner_dish if any(d["id"] == banner_dish for d in dishes) else None,
            starts_at=_parse_local(request.form.get("banner_start")),
            ends_at=_parse_local(request.form.get("banner_end")),
            active=request.form.get("banner_active") == "on",
        )
        c.commit()
        flash("Saved. Customers will see the changes within a minute.")
        return redirect(url_for("promotions"))

    banner = db.get_banner(c, rid)
    banner["start_input"] = _to_local_input(banner["starts_at"])
    banner["end_input"] = _to_local_input(banner["ends_at"])
    return render_template("promotions.html", dishes=dishes, banner=banner, live=db.live_banner(c, rid))


@app.get("/report")
@login_required
def monthly_report():
    rid = g.restaurant["id"]
    this_month = stats.month(stats.today().year, stats.today().month)
    months = [this_month]
    for _ in range(11):
        months.append(stats.previous_month(months[-1]))
    chosen = request.args.get("month") or months[1].start.strftime("%Y-%m")
    try:
        period = report.parse_month(chosen)
    except ValueError:
        abort(400)
    message, _ = report.build(conn(), rid, period)
    return render_template(
        "report.html",
        message=message,
        link=report.whatsapp_link(message, g.restaurant["whatsapp"]),
        months=months,
        chosen=chosen,
        in_progress=period.start == this_month.start,
    )


def _parse_local(text):
    """'2026-10-20T15:00' from a datetime-local input → unix seconds in the restaurant's time zone."""
    if not text:
        return None
    try:
        return int(datetime.fromisoformat(text).replace(tzinfo=config.TIMEZONE).timestamp())
    except ValueError:
        return None


def _to_local_input(ts):
    return datetime.fromtimestamp(ts, config.TIMEZONE).strftime("%Y-%m-%dT%H:%M") if ts else ""


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
