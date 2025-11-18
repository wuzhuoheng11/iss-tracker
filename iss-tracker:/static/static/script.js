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

async function updateData() {
    const latest = await fetch("/api/latest").then(r => r.json());
    const history = await fetch("/api/history").then(r => r.json());

    if (!latest.latitude) return;

    // Update map marker
    issMarker.setLatLng([latest.latitude, latest.longitude]);
    map.setView([latest.latitude, latest.longitude], 3);

    // Update path
    pathCoords = history.map(h => [h.latitude, h.longitude]);
    polyline.setLatLngs(pathCoords);

    // Update charts
    altitudeChart.data.labels = history.map(h => h.timestamp);
    altitudeChart.data.datasets[0].data = history.map(h => h.altitude);
    altitudeChart.update();

    longitudeChart.data.labels = history.map(h => h.timestamp);
    longitudeChart.data.datasets[0].data = history.map(h => h.longitude);
    longitudeChart.update();
}

setInterval(updateData, 3000);
