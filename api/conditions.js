module.exports = async function handler(req, res) {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing lat or lon" });
    }

    const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY;
    const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

    if (!OPENAQ_API_KEY || !OPENWEATHER_API_KEY) {
      return res.status(500).json({
        error: "Missing API keys",
        has_OPENAQ_API_KEY: Boolean(OPENAQ_API_KEY),
        has_OPENWEATHER_API_KEY: Boolean(OPENWEATHER_API_KEY)
      });
    }

    /* ---------------- OpenAQ: nearest location ---------------- */
    const locUrl =
      `https://api.openaq.org/v3/locations?coordinates=${encodeURIComponent(lat)},${encodeURIComponent(lon)}&radius=5000&limit=1`;

    const locResp = await fetch(locUrl, {
      headers: { "X-API-Key": OPENAQ_API_KEY }
    });
    const locJson = await locResp.json();

    if (!locResp.ok) {
      return res.status(502).json({
        error: "OpenAQ location lookup failed",
        detail: locJson
      });
    }

    const location = locJson?.results?.[0] || null;

    /* ---------------- OpenAQ: latest (values + sensorsId only) ---------------- */
    let measurements = [];

    if (location?.id) {
      const latestUrl = `https://api.openaq.org/v3/locations/${location.id}/latest?limit=50`;

      const latestResp = await fetch(latestUrl, {
        headers: { "X-API-Key": OPENAQ_API_KEY }
      });
      const latestJson = await latestResp.json();

      if (!latestResp.ok) {
        return res.status(502).json({
          error: "OpenAQ latest request failed",
          detail: latestJson
        });
      }

      const latestRows = Array.isArray(latestJson?.results) ? latestJson.results : [];

      // Collect unique sensorsId from latest rows
      const sensorIds = [...new Set(
        latestRows
          .map(r => r?.sensorsId)
          .filter(id => Number.isInteger(id))
      )];

      // Fetch sensor metadata for each sensorId (limit to avoid hammering API)
      const sensorIdLimit = 15;
      const idsToFetch = sensorIds.slice(0, sensorIdLimit);

      const sensorMetaById = {};

      await Promise.all(
        idsToFetch.map(async (sid) => {
          const sResp = await fetch(`https://api.openaq.org/v3/sensors/${sid}`, {
            headers: { "X-API-Key": OPENAQ_API_KEY }
          });

          // Even if one fails, don't break the whole endpoint
          if (!sResp.ok) return;

          const sJson = await sResp.json();
          const sensor = sJson?.results?.[0] || null;

          // sensors response includes parameter metadata (name/units/displayName)
          const p = sensor?.parameter || null;

          sensorMetaById[sid] = {
            parameter: typeof p?.name === "string" ? p.name : null,
            display: typeof p?.displayName === "string" ? p.displayName : null,
            unit: typeof p?.units === "string" ? p.units : null
          };
        })
      );

      // Build the measurement objects for frontend chart
      measurements = latestRows
        .map(r => {
          const sid = r?.sensorsId;
          const meta = sensorMetaById[sid] || {};

          const paramName =
            (meta.parameter && String(meta.parameter).toLowerCase()) || "unknown";

          return {
            parameter: paramName,
            display: meta.display || meta.parameter || "unknown",
            value: typeof r?.value === "number" ? r.value : null,
            unit: meta.unit || "",
            datetime: r?.datetime?.local ?? r?.datetime?.utc ?? null
          };
        })
        .filter(m => typeof m.value === "number"); // only usable points
    }

    /* ---------------- OpenWeather: current weather ---------------- */
    const weatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=metric&appid=${OPENWEATHER_API_KEY}`;

    const weatherResp = await fetch(weatherUrl);
    const weatherJson = await weatherResp.json();

    if (!weatherResp.ok) {
      return res.status(502).json({
        error: "OpenWeather request failed",
        detail: weatherJson
      });
    }

    /* ---------------- Final response ---------------- */
    return res.status(200).json({
      input: { lat: Number(lat), lon: Number(lon) },
      openaq_location: location ? { id: location.id, name: location.name } : null,
      openaq_measurements: measurements,
      weather: {
        name: weatherJson?.name ?? null,
        temp_c: weatherJson?.main?.temp ?? null,
        humidity_pct: weatherJson?.main?.humidity ?? null,
        wind_mps: weatherJson?.wind?.speed ?? null
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      detail: String(err)
    });
  }
};
