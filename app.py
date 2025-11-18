from flask import Flask, jsonify, render_template
import requests
import sqlite3
import threading
import time

app = Flask(__name__)

DB_NAME = "database.db"
API_URL = "https://api.wheretheiss.at/v1/satellites/25544"

# --------------------------
# DATABASE INITIALIZATION
# --------------------------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            latitude REAL,
            longitude REAL,
            altitude REAL,
            velocity REAL
        )
    """)
    conn.commit()
    conn.close()


# --------------------------
# SAVE TELEMETRY
# --------------------------
def save_telemetry(data):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO telemetry (timestamp, latitude, longitude, altitude, velocity)
        VALUES (?, ?, ?, ?, ?)
    """, (data["timestamp"], data["latitude"], data["longitude"], data["altitude"], data["velocity"]))
    conn.commit()
    conn.close()


# --------------------------
# BACKGROUND FETCHER
# --------------------------
def fetch_iss_data():
    while True:
        try:
            response = requests.get(API_URL, timeout=5)
            if response.status_code == 200:
                data = response.json()
                save_telemetry(data)
        except Exception as e:
            print("Error fetching:", e)

        time.sleep(5)  # every 5 seconds


# --------------------------
# API: Latest data
# --------------------------
@app.route("/api/latest")
def latest_data():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("SELECT timestamp, latitude, longitude, altitude, velocity FROM telemetry ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "No data yet"})

    return jsonify({
        "timestamp": row[0],
        "latitude": row[1],
        "longitude": row[2],
        "altitude": row[3],
        "velocity": row[4]
    })


# --------------------------
# API: Full history
# --------------------------
@app.route("/api/history")
def history():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()
    cur.execute("SELECT timestamp, latitude, longitude, altitude, velocity FROM telemetry ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()

    return jsonify([
        {
            "timestamp": r[0],
            "latitude": r[1],
            "longitude": r[2],
            "altitude": r[3],
            "velocity": r[4]
        }
        for r in rows
    ])


# --------------------------
# FRONTEND INDEX PAGE
# --------------------------
@app.route("/")
def index():
    return render_template("index.html")


# --------------------------
# MAIN
# --------------------------
if __name__ == "__main__":
    init_db()

    # start background thread
    thread = threading.Thread(target=fetch_iss_data)
    thread.daemon = True
    thread.start()

    app.run(host="0.0.0.0", port=5000)
