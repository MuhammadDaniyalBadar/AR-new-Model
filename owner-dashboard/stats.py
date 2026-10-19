"""
Turns raw events into the numbers the owner sees. Used by the dashboard and
the monthly report, so both always agree.

Volumes are small (a busy restaurant produces a few thousand events a day),
so events are loaded for the period and counted in Python. That keeps the
logic readable and lets "day" and "hour" use the restaurant's time zone.
"""
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta

import config
import db

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@dataclass
class Period:
    start: date          # first day, inclusive
    end: date            # last day, inclusive
    label: str

    @property
    def days(self):
        return (self.end - self.start).days + 1

    def bounds(self):
        tz = config.TIMEZONE
        a = datetime.combine(self.start, time.min, tz)
        b = datetime.combine(self.end + timedelta(days=1), time.min, tz)
        return int(a.timestamp()), int(b.timestamp())

    def previous(self):
        """The period of the same length just before this one."""
        end = self.start - timedelta(days=1)
        return Period(end - timedelta(days=self.days - 1), end, "previous period")


def today():
    return datetime.now(config.TIMEZONE).date()


def last_days(n, until=None):
    until = until or today()
    return Period(until - timedelta(days=n - 1), until, f"Last {n} days")


def month(year, month_number):
    start = date(year, month_number, 1)
    nxt = date(year + (month_number == 12), month_number % 12 + 1, 1)
    return Period(start, nxt - timedelta(days=1), start.strftime("%B %Y"))


def previous_month(p):
    first = p.start.replace(day=1) - timedelta(days=1)
    return month(first.year, first.month)


@dataclass
class DishStats:
    id: str
    name: str
    views: int = 0
    visitors: int = 0
    avg_seconds: float = 0
    explode: int = 0
    details: int = 0
    ar: int = 0
    badges: list = field(default_factory=list)
    unavailable: bool = False

    def rate(self, n):
        return round(100 * n / self.views) if self.views else 0


def _pct_change(now, before):
    if not before:
        return None
    return round(100 * (now - before) / before)


def compute(conn, restaurant_id, period, compare_to=None):
    start_ts, end_ts = period.bounds()
    rows = db.events_between(conn, restaurant_id, start_ts, end_ts)
    tz = config.TIMEZONE

    catalog = {d["id"]: d for d in db.list_dishes(conn, restaurant_id)}
    dishes = {
        d["id"]: DishStats(d["id"], d["name"], badges=d["badges"], unavailable=d["unavailable"])
        for d in catalog.values()
    }

    def dish(dish_id):
        if dish_id not in dishes:  # seen in events but the app never sent its name
            dishes[dish_id] = DishStats(dish_id, dish_id.replace("-", " ").title())
        return dishes[dish_id]

    totals = Counter()
    sessions = set()
    dish_sessions = defaultdict(set)
    seconds = defaultdict(float)  # (session, dish) -> seconds; a visit can arrive in pieces
    per_day = Counter()
    per_hour = Counter()
    per_slot = Counter()  # (weekday, hour)
    has_demo = False

    for r in rows:
        has_demo = has_demo or bool(r["demo"])
        sessions.add(r["session_id"])
        kind = r["type"]
        if kind == "menu":
            totals["menu"] += 1
            continue
        if not r["dish_id"]:
            continue
        d = dish(r["dish_id"])
        if kind == "view":
            local = datetime.fromtimestamp(r["ts"], tz)
            totals["views"] += 1
            if r["source"] == "qr":
                totals["scans"] += 1
            d.views += 1
            dish_sessions[d.id].add(r["session_id"])
            per_day[local.date()] += 1
            per_hour[local.hour] += 1
            per_slot[(local.weekday(), local.hour)] += 1
        elif kind == "time":
            if r["value"] and r["value"] > 0:
                seconds[(r["session_id"], d.id)] += r["value"]
        elif kind in ("explode", "details", "ar"):
            setattr(d, kind, getattr(d, kind) + 1)
            totals[kind] += 1

    per_dish_seconds = defaultdict(list)
    for (_sid, dish_id), secs in seconds.items():
        if secs <= config.MAX_SECONDS_ON_DISH:
            per_dish_seconds[dish_id].append(secs)
    all_seconds = [x for v in per_dish_seconds.values() for x in v]
    for d in dishes.values():
        d.visitors = len(dish_sessions[d.id])
        own = per_dish_seconds[d.id]
        d.avg_seconds = round(sum(own) / len(own)) if own else 0

    ranked = sorted(dishes.values(), key=lambda d: (-d.views, d.name))
    viewed = [d for d in ranked if d.views]

    busiest = None
    if per_slot:
        (wd, hr), n = per_slot.most_common(1)[0]
        busiest = {"weekday": WEEKDAYS[wd], "hour": hr, "label": f"{WEEKDAYS[wd]}, {_hour_range(hr)}", "views": n}

    days = [period.start + timedelta(days=i) for i in range(period.days)]
    result = {
        "period": period,
        "visitors": len(sessions),
        "views": totals["views"],
        "scans": totals["scans"],
        "menu_opens": totals["menu"],
        "explode": totals["explode"],
        "details": totals["details"],
        "ar": totals["ar"],
        "avg_seconds": round(sum(all_seconds) / len(all_seconds)) if all_seconds else 0,
        "dishes": ranked,
        "top": viewed[0] if viewed else None,
        "daily": [{"date": d.isoformat(), "label": d.strftime("%d %b"), "views": per_day[d]} for d in days],
        "hourly": [{"hour": h, "label": _hour_label(h), "views": per_hour[h]} for h in range(24)],
        "busiest": busiest,
        "insights": _insights(viewed, ranked),
        "has_demo": has_demo,
    }

    if compare_to:
        before = compute(conn, restaurant_id, compare_to)
        result["change"] = {
            key: _pct_change(result[key], before[key])
            for key in ("visitors", "views", "scans", "explode", "ar", "avg_seconds")
        }
    return result


def _insights(viewed, ranked):
    """Plain-language notes for the owner. Only said when the data supports it."""
    notes = []
    enough = [d for d in viewed if d.views >= 20]
    if len(enough) >= 3:
        quick = min(enough, key=lambda d: d.avg_seconds)
        avg = sum(d.avg_seconds for d in enough) / len(enough)
        if quick.avg_seconds and quick.avg_seconds < 0.6 * avg:
            notes.append(
                f"People leave {quick.name} quickly ({quick.avg_seconds} sec vs {round(avg)} sec on average). "
                "Its name or description may not be selling it."
            )
        curious = max(enough, key=lambda d: d.rate(d.explode))
        notes.append(
            f"{curious.name} makes people most curious: {curious.rate(curious.explode)}% of viewers took it apart."
        )
        ar = max(enough, key=lambda d: d.rate(d.ar))
        if ar.ar:
            notes.append(f"{ar.name} is the dish people most want to see on their table ({ar.rate(ar.ar)}% opened AR).")
    unseen = [d for d in ranked if not d.views]
    if unseen and viewed:
        names = ", ".join(d.name for d in unseen[:3])
        notes.append(f"Nobody looked at {names} in this period. A badge or the banner could help.")
    return notes


def _hour_label(h):
    return f"{(h % 12) or 12} {'am' if h < 12 else 'pm'}"


def _hour_range(h):
    return f"{_hour_label(h)}–{_hour_label((h + 1) % 24)}"


def fmt_seconds(s):
    s = int(round(s or 0))
    return f"{s // 60} min {s % 60} sec" if s >= 60 else f"{s} sec"
