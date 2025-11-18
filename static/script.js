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
    data: { 
        labels: [], 
        datasets: [{ 
            label: "Altitude (km)", 
            data: [],
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            tension: 0.4
        }] 
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Altitude Over Time'
            }
        }
    }
});

let velocityChart = new Chart(document.getElementById("velocityChart"), {
    type: "line",
    data: { 
        labels: [], 
        datasets: [{ 
            label: "Velocity (km/h)", 
            data: [],
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            tension: 0.4
        }] 
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Velocity Over Time'
            }
        }
    }
});

// 格式化时间戳
function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toUTCString();
}

function formatTableTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toISOString().replace('T', ' ').substring(0, 19);
}

// 更新分析摘要
function updateAnalytics(history) {
    if (history.length > 0) {
        const longitudes = history.map(h => h.longitude);
        const maxLon = Math.max(...longitudes).toFixed(2);
        const minLon = Math.min(...longitudes).toFixed(2);
        
        // 计算高度变化
        let altChangeCount = 0;
        let totalAltChange = 0;
        
        for (let i = 1; i < history.length; i++) {
            const change = Math.abs(history[i].altitude - history[i-1].altitude);
            if (change > 0.001) {
                altChangeCount++;
                totalAltChange += change;
            }
        }
        
        document.getElementById('maxLon').textContent = maxLon;
        document.getElementById('minLon').textContent = minLon;
        document.getElementById('altChangeCount').textContent = altChangeCount;
        document.getElementById('totalAltChange').textContent = totalAltChange.toFixed(2);
    }
}

// 更新数据表格
function updateDataTable(history) {
    const tableBody = document.getElementById('tableBody');
    const recentData = history.slice(-1000); // 最后1000条数据
    
    if (recentData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No data available</td></tr>';
        return;
    }
    
    // 反转顺序，最新的在最上面
    const reversedData = [...recentData].reverse();
    
    tableBody.innerHTML = reversedData.map((point, index) => `
        <tr>
            <td>${point.id || (recentData.length - index)}</td>
            <td>${point.latitude.toFixed(6)}</td>
            <td>${point.longitude.toFixed(6)}</td>
            <td>${point.altitude.toFixed(6)}</td>
            <td>${point.velocity.toFixed(6)}</td>
            <td>${formatTableTimestamp(point.timestamp)}</td>
        </tr>
    `).join('');
}

// 更新最近历史
function updateRecentHistory(history) {
    if (history.length > 0) {
        const recent = history.slice(-10).reverse(); // 取最后10条并反转顺序
        const historyHTML = recent.map(point => `
            <div class="history-item">
                <strong>${formatTimestamp(point.timestamp)}</strong><br>
                Lat: ${point.latitude.toFixed(4)}, Lon: ${point.longitude.toFixed(4)}<br>
                Alt: ${point.altitude.toFixed(2)} km, Vel: ${Math.round(point.velocity)} km/h
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

        // 更新最新位置
        if (latest.timestamp) {
            document.getElementById('latestTime').textContent = formatTimestamp(latest.timestamp);
            document.getElementById('latestLat').textContent = latest.latitude.toFixed(6);
            document.getElementById('latestLon').textContent = latest.longitude.toFixed(6);
            document.getElementById('latestAlt').textContent = latest.altitude.toFixed(2);
            document.getElementById('latestVel').textContent = Math.round(latest.velocity);
        }

        // 更新分析摘要
        updateAnalytics(history);
        
        // 更新数据表格
        updateDataTable(history);
        
        // 更新最近历史
        updateRecentHistory(history);

        // Update map marker
        issMarker.setLatLng([latest.latitude, latest.longitude]);
        map.setView([latest.latitude, latest.longitude], 3);

        // Update path
        pathCoords = history.map(h => [h.latitude, h.longitude]);
        polyline.setLatLngs(pathCoords);

        // Update charts (最后100个点)
        const chartData = history.slice(-100);
        altitudeChart.data.labels = chartData.map(h => formatTimestamp(h.timestamp));
        altitudeChart.data.datasets[0].data = chartData.map(h => h.altitude);
        altitudeChart.update();

        velocityChart.data.labels = chartData.map(h => formatTimestamp(h.timestamp));
        velocityChart.data.datasets[0].data = chartData.map(h => h.velocity);
        velocityChart.update();

    } catch (error) {
        console.log("Update error:", error);
    }
}

// 立即加载一次数据
updateData();
// 然后每20秒更新一次
setInterval(updateData, 20000);
