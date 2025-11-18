let map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 5
}).addTo(map);

let issMarker = L.marker([0, 0]).addTo(map);
let pathCoords = [];
let polyline = L.polyline([], {color: 'red'}).addTo(map);

// Chart.js sets
let altitudeChart = new Chart(document.getElementById("altitudeChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Altitude (km)", data: [] }] }
});

let longitudeChart = new Chart(document.getElementById("longitudeChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "Longitude", data: [] }] }
});

// 格式化时间戳
function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toUTCString();
}

// 更新仪表板
function updateDashboard(latest, history) {
    // 更新最新位置
    if (latest.timestamp) {
        document.getElementById('latestTime').textContent = formatTimestamp(latest.timestamp);
        document.getElementById('latestLat').textContent = latest.latitude.toFixed(6);
        document.getElementById('latestLon').textContent = latest.longitude.toFixed(6);
        document.getElementById('latestAlt').textContent = latest.altitude.toFixed(2);
        document.getElementById('latestVel').textContent = Math.round(latest.velocity);
    }
    
    // 更新最近历史（显示最后5条记录）
    if (history && history.length > 0) {
        const recent = history.slice(-5).reverse(); // 取最后5条并反转顺序
        const historyHTML = recent.map(point => `
            <div class="history-item">
                <strong>${formatTimestamp(point.timestamp)}</strong><br>
                Lat: ${point.latitude.toFixed(4)}, Lon: ${point.longitude.toFixed(4)}<br>
                Alt: ${point.altitude.toFixed(1)} km, Vel: ${Math.round(point.velocity)} km/h
            </div>
        `).join('');
        document.getElementById('recentHistory').innerHTML = historyHTML;
    }
}

async function updateData() {
    try {
        const latestResponse = await fetch("/api/latest");
        const historyResponse = await fetch("/api/history");
        
        const latest = await latestResponse.json();
        const history = await historyResponse.json();

        if (latest.error) {
            console.log("API Error:", latest.error);
            return;
        }

        if (!latest.latitude) return;

        // 更新仪表板
        updateDashboard(latest, history);

        // Update map marker
        issMarker.setLatLng([latest.latitude, latest.longitude]);
        map.setView([latest.latitude, latest.longitude], 3);

        // Update path
        pathCoords = history.map(h => [h.latitude, h.longitude]);
        polyline.setLatLngs(pathCoords);

        // Update charts
        altitudeChart.data.labels = history.map(h => formatTimestamp(h.timestamp));
        altitudeChart.data.datasets[0].data = history.map(h => h.altitude);
        altitudeChart.update();

        longitudeChart.data.labels = history.map(h => formatTimestamp(h.timestamp));
        longitudeChart.data.datasets[0].data = history.map(h => h.longitude);
        longitudeChart.update();

    } catch (error) {
        console.log("Update error:", error);
    }
}

// 立即加载一次数据
updateData();
// 然后每3秒更新一次
setInterval(updateData, 3000);
