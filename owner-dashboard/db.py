"""SQLite storage. One file, no database server to install."""
import sqlite3
import time

import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS restaurants (
    id            TEXT PRIMARY KEY,          -- same id as restaurants/<id>/ in the menu app
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    whatsapp      TEXT,                      -- owner's number for the monthly report, e.g. 923001234567
    created_at    INTEGER NOT NULL
);

-- Dish names, reported by the menu app itself so they always match.
CREATE TABLE IF NOT EXISTS dishes (
    restaurant_id TEXT NOT NULL,
    id            TEXT NOT NULL,
    name          TEXT NOT NULL,
    category      TEXT,
    sort          INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (restaurant_id, id)
);

-- What the owner sets per dish.
CREATE TABLE IF NOT EXISTS dish_settings (
    restaurant_id TEXT NOT NULL,
    dish_id       TEXT NOT NULL,
    badges        TEXT NOT NULL DEFAULT '',  -- comma separated keys from config.BADGES
    unavailable   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (restaurant_id, dish_id)
);

-- One promo banner per restaurant.
CREATE TABLE IF NOT EXISTS banners (
    restaurant_id TEXT PRIMARY KEY,
    text          TEXT NOT NULL DEFAULT '',
    dish_id       TEXT,                      -- optional: tapping the banner opens this dish
    starts_at     INTEGER,                   -- optional, unix seconds
    ends_at       INTEGER,                   -- optional, unix seconds
    active        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
    id            INTEGER PRIMARY KEY,
    restaurant_id TEXT NOT NULL,
    session_id    TEXT NOT NULL,             -- random per browser tab, no personal data
    type          TEXT NOT NULL,             -- see config.EVENT_TYPES
    dish_id       TEXT,
    source        TEXT,                      -- for views: qr or menu
    value         REAL,                      -- for time: seconds spent on the dish
    ts            INTEGER NOT NULL,          -- unix seconds, UTC
    demo          INTEGER NOT NULL DEFAULT 0 -- 1 = sample data from manage.py demo-data
);
CREATE INDEX IF NOT EXISTS events_by_time ON events (restaurant_id, ts);
"""


def connect(path=None):
    conn = sqlite3.connect(path or config.DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init(conn):
    conn.executescript(SCHEMA)
    conn.commit()


def now():
    return int(time.time())


# ---------------------------------------------------------------- restaurants

def get_restaurant(conn, restaurant_id):
    return conn.execute("SELECT * FROM restaurants WHERE id = ?", (restaurant_id,)).fetchone()


def list_restaurants(conn):
    return conn.execute("SELECT * FROM restaurants ORDER BY name").fetchall()


# ---------------------------------------------------------------------- dishes

def upsert_dishes(conn, restaurant_id, dishes):
    for sort, d in enumerate(dishes):
        conn.execute(
            """INSERT INTO dishes (restaurant_id, id, name, category, sort) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT (restaurant_id, id) DO UPDATE SET
                 name = excluded.name, category = excluded.category, sort = excluded.sort""",
            (restaurant_id, d["id"], d["name"], d.get("category"), sort),
        )
    conn.commit()


def list_dishes(conn, restaurant_id):
    """Dishes with the owner's settings. Includes dishes only seen in events."""
    rows = conn.execute(
        """SELECT d.id, d.name, d.category, d.sort,
                  COALESCE(s.badges, '') AS badges, COALESCE(s.unavailable, 0) AS unavailable
           FROM dishes d
           LEFT JOIN dish_settings s ON s.restaurant_id = d.restaurant_id AND s.dish_id = d.id
           WHERE d.restaurant_id = ?
           ORDER BY d.sort, d.name""",
        (restaurant_id,),
    ).fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "category": r["category"],
            "badges": [b for b in r["badges"].split(",") if b in config.BADGES],
            "unavailable": bool(r["unavailable"]),
        }
        for r in rows
    ]


def save_dish_settings(conn, restaurant_id, dish_id, badges, unavailable):
    badges = ",".join(b for b in badges if b in config.BADGES)
    conn.execute(
        """INSERT INTO dish_settings (restaurant_id, dish_id, badges, unavailable) VALUES (?, ?, ?, ?)
           ON CONFLICT (restaurant_id, dish_id) DO UPDATE SET
             badges = excluded.badges, unavailable = excluded.unavailable""",
        (restaurant_id, dish_id, badges, int(bool(unavailable))),
    )


# --------------------------------------------------------------------- banner

def get_banner(conn, restaurant_id):
    row = conn.execute("SELECT * FROM banners WHERE restaurant_id = ?", (restaurant_id,)).fetchone()
    return dict(row) if row else {"text": "", "dish_id": None, "starts_at": None, "ends_at": None, "active": 0}


def save_banner(conn, restaurant_id, text, dish_id, starts_at, ends_at, active):
    conn.execute(
        """INSERT INTO banners (restaurant_id, text, dish_id, starts_at, ends_at, active) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (restaurant_id) DO UPDATE SET
             text = excluded.text, dish_id = excluded.dish_id, starts_at = excluded.starts_at,
             ends_at = excluded.ends_at, active = excluded.active""",
        (restaurant_id, text, dish_id or None, starts_at, ends_at, int(bool(active))),
    )


def live_banner(conn, restaurant_id, at=None):
    """The banner customers should see right now, or None."""
    b = get_banner(conn, restaurant_id)
    at = at or now()
    if not b["active"] or not b["text"].strip():
        return None
    if b["starts_at"] and at < b["starts_at"]:
        return None
    if b["ends_at"] and at >= b["ends_at"]:
        return None
    return {"text": b["text"], "dish": b["dish_id"]}


# --------------------------------------------------------------------- events

def insert_events(conn, rows):
    conn.executemany(
        """INSERT INTO events (restaurant_id, session_id, type, dish_id, source, value, ts, demo)
           VALUES (:restaurant_id, :session_id, :type, :dish_id, :source, :value, :ts, :demo)""",
        rows,
    )
    conn.commit()


def events_between(conn, restaurant_id, start_ts, end_ts):
    return conn.execute(
        """SELECT session_id, type, dish_id, source, value, ts, demo FROM events
           WHERE restaurant_id = ? AND ts >= ? AND ts < ?""",
        (restaurant_id, start_ts, end_ts),
    ).fetchall()
