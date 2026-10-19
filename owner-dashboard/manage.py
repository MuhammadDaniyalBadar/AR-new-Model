"""
Admin commands for you (the vendor), run in a terminal:

    python manage.py add-restaurant burgerlab "Burger Lab" --whatsapp 923001234567
    python manage.py set-password burgerlab
    python manage.py set-whatsapp burgerlab 923001234567
    python manage.py list
    python manage.py demo-data burgerlab --days 60     # sample numbers for a sales pitch
    python manage.py clear-demo burgerlab              # remove the sample numbers again

The restaurant id must be the same as the folder name in restaurants/<id>/
of the menu app.
"""
import argparse
import getpass
import math
import random
import secrets
import sys
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

import config
import db
import stats


def ask_password():
    while True:
        p1 = getpass.getpass("Owner password (at least 8 characters): ")
        if len(p1) < 8:
            print("Too short.")
            continue
        if p1 != getpass.getpass("Same password again: "):
            print("They don't match.")
            continue
        return p1


def cmd_add(conn, a):
    if db.get_restaurant(conn, a.id):
        print(f'"{a.id}" already exists. Use set-password or set-whatsapp to change it.')
        return 1
    password = a.password or ask_password()
    conn.execute(
        "INSERT INTO restaurants (id, name, password_hash, whatsapp, created_at) VALUES (?, ?, ?, ?, ?)",
        (a.id, a.name, generate_password_hash(password), a.whatsapp, db.now()),
    )
    conn.commit()
    print(f'Added {a.name}. The owner logs in with restaurant ID "{a.id}" and that password.')


def cmd_password(conn, a):
    if not db.get_restaurant(conn, a.id):
        print(f'Unknown restaurant "{a.id}".')
        return 1
    password = a.password or ask_password()
    conn.execute("UPDATE restaurants SET password_hash = ? WHERE id = ?", (generate_password_hash(password), a.id))
    conn.commit()
    print("Password changed.")


def cmd_whatsapp(conn, a):
    conn.execute("UPDATE restaurants SET whatsapp = ? WHERE id = ?", (a.number, a.id))
    conn.commit()
    print("WhatsApp number saved.")


def cmd_list(conn, _a):
    rows = db.list_restaurants(conn)
    if not rows:
        print("No restaurants yet. Add one with add-restaurant.")
    for r in rows:
        n = conn.execute("SELECT COUNT(*) FROM events WHERE restaurant_id = ?", (r["id"],)).fetchone()[0]
        print(f"{r['id']:<16} {r['name']:<24} WhatsApp: {r['whatsapp'] or '-':<14} events: {n:,}")


# Rough shape of restaurant traffic: lunch and a bigger late dinner, busier weekends.
HOURLY = [0.2, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.3, 0.9, 1.3, 1.1, 0.7, 0.6, 0.8, 1.2, 1.7, 2.2, 2.4, 2.0, 1.0]
WEEKDAY = [0.8, 0.75, 0.8, 0.85, 1.15, 1.35, 1.3]


def cmd_demo(conn, a):
    """Believable sample traffic, marked demo=1 so it can be removed and is labelled in the dashboard."""
    if not db.get_restaurant(conn, a.id):
        print(f'Unknown restaurant "{a.id}".')
        return 1
    dishes = db.list_dishes(conn, a.id)
    if not dishes:
        print("No dishes yet. Open the menu app once (with VITE_OWNER_API set) so it sends its dish list,")
        print("then run this again.")
        return 1

    rng = random.Random(a.seed)
    # Popularity: a few hits, a long tail, one dish that gets almost no attention.
    weights = [1 / (i + 1) ** 0.8 for i in range(len(dishes))]
    rng.shuffle(weights)
    weights[-1] *= 0.05
    quick_dish = rng.randrange(len(dishes))           # one dish people leave quickly
    curious = {d["id"]: rng.uniform(0.35, 0.75) for d in dishes}
    ar_rate = {d["id"]: rng.uniform(0.12, 0.38) for d in dishes}

    tz = config.TIMEZONE
    today = stats.today()
    rows = []
    for day_offset in range(a.days, 0, -1):
        day = today - timedelta(days=day_offset - 1)
        growth = 0.75 + 0.5 * (a.days - day_offset) / max(a.days, 1)  # usage grows as people notice the QR codes
        n_sessions = int(a.per_day * WEEKDAY[day.weekday()] * growth * rng.uniform(0.85, 1.15))
        for _ in range(n_sessions):
            hour = rng.choices(range(24), weights=HOURLY)[0]
            t = datetime(day.year, day.month, day.day, hour, rng.randrange(60), rng.randrange(60), tzinfo=tz)
            ts = int(t.timestamp())
            if ts > db.now():
                continue
            sid = secrets.token_urlsafe(12)
            from_qr = rng.random() < 0.85
            if not from_qr:
                rows.append(_ev(a.id, sid, "menu", None, None, None, ts))
            for k in range(rng.choices([1, 2, 3, 4], weights=[50, 30, 14, 6])[0]):
                i = rng.choices(range(len(dishes)), weights=weights)[0]
                dish = dishes[i]["id"]
                ts += rng.randint(5, 40)
                rows.append(_ev(a.id, sid, "view", dish, "qr" if from_qr and k == 0 else "menu", None, ts))
                if rng.random() < curious[dish]:
                    rows.append(_ev(a.id, sid, "explode", dish, None, None, ts + rng.randint(3, 15)))
                if rng.random() < 0.3:
                    rows.append(_ev(a.id, sid, "details", dish, None, None, ts + rng.randint(5, 25)))
                if rng.random() < ar_rate[dish]:
                    rows.append(_ev(a.id, sid, "ar", dish, None, None, ts + rng.randint(10, 40)))
                secs = rng.lognormvariate(math.log(14 if i == quick_dish else 42), 0.5)
                ts += int(secs)
                rows.append(_ev(a.id, sid, "time", dish, None, round(secs, 1), ts))
    db.insert_events(conn, rows)
    print(f"Added {len(rows):,} sample events over {a.days} days. Remove them with: python manage.py clear-demo {a.id}")


def _ev(rid, sid, kind, dish, source, value, ts):
    return {"restaurant_id": rid, "session_id": sid, "type": kind, "dish_id": dish,
            "source": source, "value": value, "ts": ts, "demo": 1}


def cmd_clear_demo(conn, a):
    n = conn.execute("DELETE FROM events WHERE restaurant_id = ? AND demo = 1", (a.id,)).rowcount
    conn.commit()
    print(f"Removed {n:,} sample events. Real customer data is untouched.")


def main(argv=None):
    p = argparse.ArgumentParser(description="Owner dashboard admin")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("add-restaurant")
    s.add_argument("id")
    s.add_argument("name")
    s.add_argument("--whatsapp")
    s.add_argument("--password", help="skip the prompt (avoid on shared computers)")
    s.set_defaults(fn=cmd_add)

    s = sub.add_parser("set-password")
    s.add_argument("id")
    s.add_argument("--password")
    s.set_defaults(fn=cmd_password)

    s = sub.add_parser("set-whatsapp")
    s.add_argument("id")
    s.add_argument("number")
    s.set_defaults(fn=cmd_whatsapp)

    sub.add_parser("list").set_defaults(fn=cmd_list)

    s = sub.add_parser("demo-data")
    s.add_argument("id")
    s.add_argument("--days", type=int, default=60)
    s.add_argument("--per-day", type=int, default=90, help="customers per normal day")
    s.add_argument("--seed", type=int, default=7)
    s.set_defaults(fn=cmd_demo)

    s = sub.add_parser("clear-demo")
    s.add_argument("id")
    s.set_defaults(fn=cmd_clear_demo)

    a = p.parse_args(argv)
    conn = db.connect()
    db.init(conn)
    return a.fn(conn, a) or 0


if __name__ == "__main__":
    sys.exit(main())
