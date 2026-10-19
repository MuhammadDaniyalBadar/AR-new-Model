"""
Settings for the owner dashboard. Everything can be changed with environment
variables, so the same code runs on your laptop and on the server.

    SECRET_KEY   Signs the login cookie. Set a long random value on the server.
    DATABASE     Path to the SQLite file (default: owner-dashboard/data.db).
    TIMEZONE     Used for "today", hours and days in the dashboard (default: Asia/Karachi).
"""
import os
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
DATABASE = os.environ.get("DATABASE", str(HERE / "data.db"))
TIMEZONE = ZoneInfo(os.environ.get("TIMEZONE", "Asia/Karachi"))

# Badges an owner can put on a dish. The key is stored; the label is shown.
# The menu app gets the labels from /api/config, so this is the only list.
BADGES = {
    "bestseller": "🔥 Bestseller",
    "new": "🆕 New",
    "chef": "⭐ Chef's pick",
    "spicy": "🌶️ Spicy",
}

# What the menu app is allowed to report.
EVENT_TYPES = {"menu", "view", "time", "explode", "details", "ar"}
VIEW_SOURCES = {"qr", "menu"}

# Ignore a customer's total time on one dish above this (phone left open on the table).
MAX_SECONDS_ON_DISH = 600
