"""
Monthly report for the owner, written as a WhatsApp message.

    python report.py burgerlab            # last full month
    python report.py burgerlab 2026-10    # a specific month

Prints the message and a wa.me link. Opening the link on a phone or in
WhatsApp Web opens a chat with the owner with the message ready to send.
The dashboard has the same report under "Monthly report".
"""
import sys
from urllib.parse import quote

import db
import stats


def _n(x):
    return f"{x:,}"


def _change(pct):
    if pct is None:
        return ""
    if pct == 0:
        return " (same as last month)"
    return f" ({'▲' if pct > 0 else '▼'} {abs(pct)}% vs last month)"


def build(conn, restaurant_id, period):
    """Return (message, data). period is a stats.Period for one month."""
    r = db.get_restaurant(conn, restaurant_id)
    s = stats.compute(conn, restaurant_id, period, compare_to=stats.previous_month(period))
    ch = s["change"]

    if not s["views"]:
        msg = (
            f"📊 *{r['name']}: 3D menu report, {period.label}*\n\n"
            "No dishes were viewed this month. Check that the QR codes are on the tables "
            "and scan one to make sure it opens."
        )
        return msg, s

    lines = [
        f"📊 *{r['name']}: 3D menu report, {period.label}*",
        "",
        f"👀 *{_n(s['views'])}* dish views from *{_n(s['visitors'])}* customers{_change(ch['views'])}",
        f"📱 {_n(s['scans'])} QR code scans",
        f"⏱️ Customers spend {stats.fmt_seconds(s['avg_seconds'])} on average looking at a dish",
        f"🧩 Take apart used {_n(s['explode'])} times · 🥽 AR opened {_n(s['ar'])} times",
    ]
    if s["busiest"]:
        lines.append(f"🕘 Busiest time: {s['busiest']['label']}")

    lines += ["", "*Most viewed dishes*"]
    for i, d in enumerate([d for d in s["dishes"] if d.views][:3], 1):
        lines.append(f"{i}. {d.name}: {_n(d.views)} views")

    if s["insights"]:
        lines += ["", "*Worth knowing*"]
        lines += [f"• {note}" for note in s["insights"][:3]]

    if s["has_demo"]:
        lines += ["", "_(Sample data for demonstration)_"]
    return "\n".join(lines), s


def whatsapp_link(message, number=None):
    """wa.me link with the message filled in. Without a number WhatsApp asks who to send it to."""
    digits = "".join(ch for ch in (number or "") if ch.isdigit())
    return f"https://wa.me/{digits}?text={quote(message)}"


def parse_month(text):
    year, mon = text.split("-")
    return stats.month(int(year), int(mon))


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 1
    conn = db.connect()
    db.init(conn)
    rid = argv[1]
    r = db.get_restaurant(conn, rid)
    if not r:
        print(f'Unknown restaurant "{rid}". Add it with: python manage.py add-restaurant {rid} "Name"')
        return 1
    period = parse_month(argv[2]) if len(argv) > 2 else stats.previous_month(stats.last_days(1))
    message, _ = build(conn, rid, period)
    print(message)
    print("\nSend on WhatsApp:\n" + whatsapp_link(message, r["whatsapp"]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
