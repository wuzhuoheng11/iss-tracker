from flask import Flask, jsonify, render_template
import requests
import sqlite3
import threading
import time
import os

app = Flask(__name__, static_folder='static', template_folder='templates')

DB_NAME = "database.db"
API_URL = "https://api.wheretheiss.at/v1/satellites/25544"

# --------------------------
# DATABASE INITIALIZATION
# --------------------------
def init_db():
    try:
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
        print("✅ Database initialized successfully")
    except Exception as e:
        print(f"❌ Database init error: {e}")

# --------------------------
# SAVE TELEMETRY
# --------------------------
def save_telemetry(data):
    try:
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO telemetry (timestamp, latitude, longitude, altitude, velocity)
            VALUES (?, ?, ?, ?, ?)
        """, (data["timestamp"], data["latitude"], data["longitude"], data["altitude"], data["velocity"]))
        conn.commit()
        conn.close()
        print(f"✅ Saved data: Lat {data['latitude']}, Lon {data['longitude']}")
    except Exception as e:
        print(f"❌ Save error: {e}")

# --------------------------
# BACKGROUND FETCHER
# --------------------------
def fetch_iss_data():
    print("🚀 Starting ISS data fetcher...")
    init_db()  # 确保数据库在后台线程中初始化
    
    while True:
        try:
            response = requests.get(API_URL, timeout=10)
            if response.status_code == 200:
                data = response.json()
                save_telemetry(data)
                print(f"📡 Fetched ISS data: {data['latitude']}, {data['longitude']}")
            else:
                print(f"❌ API error: {response.status_code}")
        except Exception as e:
            print(f"❌ Fetch error: {e}")
        
        time.sleep(10)  # 每10秒获取一次

# --------------------------
# API: Latest data
# --------------------------
@app.route("/api/latest")
def latest_data():
    try:
        init_db()  # 确保数据库在API调用时存在
        
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()
        cur.execute("SELECT timestamp, latitude, longitude, altitude, velocity FROM telemetry ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        conn.close()

        if not row:
            # 如果没有数据，直接从API获取
            try:
                response = requests.get(API_URL, timeout=5)
                data = response.json()
                return jsonify({
                    "timestamp": data["timestamp"],
                    "latitude": data["latitude"],
                    "longitude": data["longitude"],
                    "altitude": data["altitude"],
                    "velocity": data["velocity"]
                })
            except:
                return jsonify({"error": "No data available"})

        return jsonify({
            "timestamp": row[0],
            "latitude": row[1],
            "longitude": row[2],
            "altitude": row[3],
            "velocity": row[4]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------------
# API: Full history
# --------------------------
@app.route("/api/history")
def history():
    try:
        init_db()  # 确保数据库在API调用时存在
        
        conn = sqlite3.connect(DB_NAME)
        cur = conn.cursor()
        cur.execute("SELECT timestamp, latitude, longitude, altitude, velocity FROM telemetry ORDER BY id ASC")
        rows = cur.fetchall()
        conn.close()

        if not rows:
            return jsonify([])

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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------------
# 手动触发数据获取
# --------------------------
@app.route("/api/fetch")
def fetch_data():
    try:
        response = requests.get(API_URL, timeout=5)
        data = response.json()
        save_telemetry(data)
        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"error": str(e)})

# --------------------------
# FRONTEND INDEX PAGE
# --------------------------
@app.route("/")
def index():
    return render_template("index.html")

# --------------------------
# 应用启动时初始化
# --------------------------
print("🌍 Starting ISS Tracker Application...")
init_db()

# 启动后台线程
thread = threading.Thread(target=fetch_iss_data)
thread.daemon = True
thread.start()
print("✅ Background thread started")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
