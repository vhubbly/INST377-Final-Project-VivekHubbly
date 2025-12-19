let map, marker, chart;

/* ---------- Helpers ---------- */
function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Map ---------- */
function initMap() {
  map = L.map("map").setView([38.9897, -76.9378], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  marker = L.marker([38.9897, -76.9378]).addTo(map);
}

/* ---------- Chart ---------- */
function initChart() {
  chart = new Chart(document.getElementById("chart"), {
    type: "bar",
    data: {
      labels: ["no data"],
      datasets: [
        {
          label: "Pollutant values (µg/m³)",
          data: [0]
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/* ---------- Favorites (DB READ) ---------- */
async function loadFavorites() {
  const out = document.getElementById("favoritesOut");
  out.textContent = "Loading…";

  try {
    const resp = await fetch("/api/favorites");
    const data = await resp.json();

    if (data.error) {
      out.textContent = `Error loading favorites: ${data.error}`;
      return;
    }

    out.innerHTML = "";
    const favs = data.favorites || [];

    if (!favs.length) {
      out.textContent = "No favorites yet.";
      return;
    }

    favs.forEach(f => {
      const div = document.createElement("div");
      div.className = "fav";
      div.textContent = `${f.name} (${Number(f.lat).toFixed(3)}, ${Number(f.lon).toFixed(3)})`;

      div.addEventListener("click", async () => {
        document.getElementById("lat").value = f.lat;
        document.getElementById("lon").value = f.lon;
        await checkConditions();
      });

      out.appendChild(div);
    });
  } catch (err) {
    out.textContent = `Failed to load favorites: ${String(err)}`;
  }
}

/* ---------- Main Fetch (External APIs) ---------- */
async function checkConditions() {
  const lat = num(document.getElementById("lat").value);
  const lon = num(document.getElementById("lon").value);

  if (lat === null || lon === null) {
    alert("Please enter valid numbers for latitude and longitude.");
    return;
  }

  // Move map immediately (visual confirmation)
  marker.setLatLng([lat, lon]);
  map.setView([lat, lon], 12);

  const weatherOut = document.getElementById("weatherOut");
  const airOut = document.getElementById("airOut");

  try {
    const url = `/api/conditions?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
    const resp = await fetch(url);

    // Read as text first so we can handle non-JSON errors cleanly
    const text = await resp.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      weatherOut.textContent = `Weather: API returned non-JSON (status ${resp.status})`;
      airOut.textContent = `Air: ${text.slice(0, 180)}`;
      console.log("Non-JSON response from /api/conditions:", { status: resp.status, text });
      return;
    }

    // If backend returned an error, show it clearly
    if (!resp.ok || data.error) {
      const msg = data.detail
        ? `${data.error} — ${typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail)}`
        : (data.status ? `${data.error} (status ${data.status})` : (data.error || `HTTP ${resp.status}`));

      weatherOut.textContent = `Weather: ${msg}`;
      airOut.textContent = `Air: ${msg}`;
      console.log("conditions error payload:", { status: resp.status, data });
      return;
    }

    // Weather output
    const w = data.weather || {};
    weatherOut.textContent =
      `Weather: ${w.name || "?"} • ${w.temp_c ?? "?"}°C • ${w.humidity_pct ?? "?"}% • wind ${w.wind_mps ?? "?"} m/s`;

    // Air output
    const loc = data.openaq_location;
    airOut.textContent =
      loc
        ? `Air station: ${loc.name} (ID ${loc.id})`
        : "Air: no nearby station found";

    // Chart update (bar chart by pollutant)
    const ms = Array.isArray(data.openaq_measurements) ? data.openaq_measurements : [];

    const EXCLUDE = new Set([
      "temperature",
      "relativehumidity",
      "humidity",
      "pressure",
      "windspeed",
      "wind",
      "um003"   // we’ll explain below; you probably want it out
    ]);

    const clean = ms
      .filter(m => typeof m.value === "number")
      .filter(m => !EXCLUDE.has(String(m.parameter || "").toLowerCase()));
    const top = clean.slice(0, 10);

    chart.data.labels = top.length ? top.map(m => m.parameter) : ["no data"];
    chart.data.datasets[0].data = top.length ? top.map(m => m.value) : [0];
    chart.update();

  } catch (err) {
    weatherOut.textContent = `Weather: fetch failed (${String(err)})`;
    airOut.textContent = `Air: fetch failed (${String(err)})`;
    console.log("fetch error:", err);
  }
}

/* ---------- Favorites (DB WRITE) ---------- */
async function saveFavorite() {
  const lat = num(document.getElementById("lat").value);
  const lon = num(document.getElementById("lon").value);
  const name = document.getElementById("favName").value.trim() || "Favorite";

  if (lat === null || lon === null) {
    alert("Enter valid latitude and longitude first.");
    return;
  }

  try {
    const resp = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, lat, lon })
    });

    const data = await resp.json();
    if (data.error) {
      alert(`Save failed: ${data.error}`);
      return;
    }

    document.getElementById("favName").value = "";
    await loadFavorites();
  } catch (err) {
    alert(`Save failed: ${String(err)}`);
  }
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initChart();
  loadFavorites();

  document.getElementById("checkBtn").addEventListener("click", checkConditions);
  document.getElementById("saveBtn").addEventListener("click", saveFavorite);
});
