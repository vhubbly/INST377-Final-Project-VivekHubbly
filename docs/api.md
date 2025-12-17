# AirSafe API Reference

## GET /api/conditions?lat=...&lon=...

Fetches air monitoring data from OpenAQ and current weather from OpenWeather, then returns a merged JSON response.

**Query Params**

* `lat` (required)
* `lon` (required)

**Returns**

* `openaq_location` (nearest station info or null)
* `openaq_latest` (array of latest readings)
* `weather` (temp/humidity/wind)

---

## GET /api/favorites

Returns all saved favorites from Supabase.

**Returns**

* `favorites`: array of { id, name, lat, lon, created_at }

---

## POST /api/favorites

Creates a new favorite record in Supabase.

**Body**

```json
{ "name": "RecWell Fields", "lat": 38.9897, "lon": -76.9378 }
```

**Returns**

* `favorite`: inserted record
