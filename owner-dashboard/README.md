# Owner dashboard (Python)

A private website for restaurant owners, built with Flask and SQLite:

- **Dashboard**: dish views, customers, QR scans, time per dish, Take apart and AR use, busiest hours, most viewed dishes, and plain-language tips.
- **Badges & banner**: 🔥 Bestseller, 🆕 New, ⭐ Chef's pick, 🌶️ Spicy, "Not available today", and a promo banner with optional start and end times. Changes reach customers' phones within a minute, with no reprinting.
- **Monthly report**: a summary written as a WhatsApp message, with a **Send on WhatsApp** button.

The menu app (the Vite project one folder up) talks to it through a small add-on in `src/addons/`. If the menu isn't given the dashboard's address, the add-on does nothing and the menu works exactly as before.

```
owner-dashboard/
  app.py          website + API (run this)
  manage.py       your admin commands: add restaurants, passwords, sample data
  report.py       monthly report (also usable from the terminal)
  stats.py        turns events into numbers (shared by dashboard and report)
  db.py           SQLite tables and queries
  config.py       settings (time zone, badges)
  templates/      the pages
  static/         styles and charts (Chart.js is bundled, no CDN needed)
  tests/          pytest tests
```

## Run it on your laptop (Windows)

In VS Code, open a terminal in the project folder:

```powershell
cd owner-dashboard
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

python manage.py add-restaurant burgerlab "Burger Lab" --whatsapp 923001234567
python app.py
```

`add-restaurant` asks for the owner's password. The id (`burgerlab`) must match the folder name in `restaurants/`. Then open http://localhost:5000 and log in.

To connect the menu app, open a **second** terminal in the project folder:

```powershell
$env:VITE_OWNER_API="http://localhost:5000"; npm run dev burgerlab
```

Open the menu, view a few dishes, and refresh the dashboard. The dish list appears under **Badges & banner** after the menu has been opened once.

## Sample data for a sales pitch

```powershell
python manage.py demo-data burgerlab --days 60
python manage.py clear-demo burgerlab
```

`demo-data` fills the dashboard with believable traffic (lunch and dinner peaks, busier weekends). The dashboard and report label it as **Sample data** so you never show made-up numbers as real ones. `clear-demo` removes only sample data; real customer data is never touched. Open the menu once first so the dashboard knows the dish names.

## Monthly report from the terminal

```powershell
python report.py burgerlab            # last full month
python report.py burgerlab 2026-10    # a specific month
```

It prints the message and a `wa.me` link that opens WhatsApp with the message ready to send.

## Other commands

```powershell
python manage.py list
python manage.py set-password burgerlab
python manage.py set-whatsapp burgerlab 923001234567
pytest tests
```

## Put it online

Netlify only hosts static sites, so the Python part needs a Python host. PythonAnywhere is the simplest; Render or Railway also work, but on them use a paid persistent disk or the SQLite file is wiped on every deploy.

**PythonAnywhere**

1. Create an account. Your site will be `https://<username>.pythonanywhere.com`.
2. In a **Bash console**: `git clone https://github.com/MuhammadDaniyalBadar/AR-new-Model.git`, then `cd AR-new-Model/owner-dashboard && pip install --user -r requirements.txt`.
3. **Web** tab → *Add a new web app* → *Manual configuration* → Python 3.10 or newer.
4. Edit the WSGI file so it contains only:
   ```python
   import os, sys
   sys.path.insert(0, "/home/<username>/AR-new-Model/owner-dashboard")
   os.environ["SECRET_KEY"] = "paste-a-long-random-string-here"
   from app import app as application
   ```
   Generate the key with `python -c "import secrets; print(secrets.token_urlsafe(32))"`.
5. Back in the console: `python manage.py add-restaurant burgerlab "Burger Lab" --whatsapp 92300...`
6. Click **Reload**, then open your site and log in.

**Connect the live menu**: in Netlify, for each restaurant's site, go to *Site configuration → Environment variables*, add `VITE_OWNER_API` = `https://<username>.pythonanywhere.com` (no slash at the end), then **Trigger deploy**.

## Settings

| Variable | Default | What it does |
| --- | --- | --- |
| `SECRET_KEY` | dev value | Signs the login cookie. **Always set it on the server.** |
| `DATABASE` | `owner-dashboard/data.db` | Where the SQLite file lives. Back this file up. |
| `TIMEZONE` | `Asia/Karachi` | Used for days and hours in the dashboard and report. |

Badge names live in `config.py` (`BADGES`). The menu reads them from the dashboard, so that's the only place to change them.

## What is tracked

Per browser tab, with a random id and no personal data: a dish was opened (from a QR code or the menu list), seconds spent looking at it while the screen was on, and taps on Take apart, Details and View in AR. Opening a dish directly by URL counts as a "QR code scan" (that's what the printed codes do); refreshing the same page doesn't count twice.

The API endpoints (`/api/events`, `/api/catalog`, `/api/config/<id>`) are public because customers' phones call them. They only accept known restaurants, known event types and valid dish ids.
