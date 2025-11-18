from flask import Flask, jsonify, render_template, send_from_directory
import requests
import sqlite3
import threading
import time
import os

app = Flask(__name__, static_folder='static', template_folder='templates')

DB_NAME = "database.db"
API_URL = "https://api.wheretheiss.at/v1/satellites/25544"

# 静态文件路由
@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

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

# ... 其余代码保持不变 ...

# --------------------------
# MAIN
# --------------------------
if __name__ == "__main__":
    init_db()

    # start background thread
    thread = threading.Thread(target=fetch_iss_data)
    thread.daemon = True
    thread.start()

    app.run(host="0.0.0.0", port=5000, debug=False)
