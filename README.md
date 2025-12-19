# INST377-Final-Project-VivekHubbly
# AirSafe

## Project Description

AirSafe is a web application that helps students and athletes make safer decisions about outdoor activities by showing real-time air quality conditions and local weather for a searched location. Users can view pollutant readings (e.g., PM2.5/PM10 where available) from OpenAQ monitoring stations, combine that with current weather from OpenWeather, and save favorite locations for quick access.

## Target Browsers

AirSafe is designed for modern desktop browsers:

* Google Chrome (latest)
* Microsoft Edge (latest)
* Mozilla Firefox (latest)
* Safari (latest on macOS)

Mobile browsers (iOS Safari / Android Chrome) should work for basic viewing, but the primary target is desktop.

## Developer Manual

See: **docs/developer-manual.md**

---

# Developer Manual (AirSafe)

## Audience

This guide is for future developers taking over AirSafe. You know web development concepts (HTML/CSS/JS, REST APIs, environment variables) but are new to this system.

---

## 1 Setup & Installation

### Prerequisites

* Node.js (LTS recommended)
* npm (comes with Node)
* A Supabase project (URL + anon key)
* OpenAQ API key
* OpenWeather API key
* Git

### Clone the repository

```bash
git clone <YOUR_REPO_URL>
cd airsafe
```

### Install dependencies

```bash
npm install
```

---

## 2 Environment Variables

Create a `.env.local` file in the project root, and set environment variables in vercel based on keys:

```bash
# OpenAQ
OPENAQ_API_KEY="your_openaq_key"

# OpenWeather
OPENWEATHER_API_KEY="your_openweather_key"

# Supabase
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"  # server-side only
```

**Important:**

* Never commit `.env.local` to GitHub.
* Only `SUPABASE_ANON_KEY` should ever be used client-side.
* `SUPABASE_SERVICE_ROLE_KEY` must be server-side only (Vercel server functions).

---

## 3 Running the application locally

### Run the frontend locally

If using a simple static frontend:

* Use VS Code Live Server OR any local static server.
* Example with npm:

```bash
npm run dev
```

(If your project uses Vite/Next, the command may differ—see package.json scripts.)

### Run backend (Vercel serverless functions)

This project uses Vercel serverless routes under `/api/*`.

To run locally with Vercel:

```bash
npm i -g vercel
vercel dev
```

Open:

* Frontend: `http://localhost:3000`
* API routes: `http://localhost:3000/api/...`

---

## 4 Running tests

If tests exist, run:

```bash
npm test
```

If no tests were added, future development should add tests for:

* API route responses
* Supabase integration
* Data parsing and error cases

---

## 5 Server API (Endpoints)

All endpoints return JSON. These endpoints are called by the frontend via Fetch API.

### (A) GET /api/conditions?lat=...&lon=...

**Purpose:** Fetch air quality + weather, merge results, return a clean combined response for the UI.
**Data Sources:** OpenAQ + OpenWeather
**Frontend usage:** App page (main functionality)

**Response fields (example):**

* location: { lat, lon }
* openaq_location: { id, name, timezone }
* air: array of latest sensor readings (value + datetime + sensorId)
* weather: { temp_c, humidity_pct, wind_mps, description }
* recommendation: string (basic guidance based on pollutant levels when available)

---

### (B) GET /api/favorites

**Purpose:** Retrieve saved favorites from Supabase.
**Data Source:** Supabase `favorites` table
**Frontend usage:** App page + Home dashboard sidebar

---

### (C) POST /api/favorites

**Purpose:** Save a new favorite location into Supabase.
**Body:** `{ name, lat, lon }`
**Frontend usage:** App page “Save Favorite” button

---

### (D) GET /api/readings?lat=...&lon=...

**Purpose:** Get historical readings stored in Supabase for a location.
**Data Source:** Supabase `readings` table
**Frontend usage:** App page charts/trends

---

### (E) POST /api/readings

**Purpose:** Insert a new combined reading (air + weather snapshot) into Supabase.
**Body:** `{ lat, lon, taken_at, pm25, pm10, temp_c, humidity_pct, wind_mps }` (fields may vary)
**Frontend usage:** Called after /api/conditions to store the snapshot

---

## 6 Database (Supabase)

### favorites table

* id (uuid/int)
* name (text)
* lat (float)
* lon (float)
* created_at (timestamp)
---

## 7 Known Bugs / Limitations

* OpenAQ data availability varies by location; some places may have limited or no sensors nearby.
* Latest measurements may return sensor IDs and values; mapping sensor IDs to pollutant names requires using the location’s `sensors` list.
* Recommendation logic is basic (rule-based) and should be improved using more standard thresholds or AQI conversion.

---

## 8 Roadmap (Future Development)

* Add pollen support (if integrating a pollen provider).
* Improve “safe training” recommendations using verified thresholds and user-specific sensitivity settings (asthma/allergies).
* Add authentication to associate favorites/readings with a user account.
* Add stronger caching and rate-limit handling.
* Add unit tests for API routes and data parsing.

---
