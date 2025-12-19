const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: "Missing Supabase env vars",
        has_SUPABASE_URL: Boolean(supabaseUrl),
        has_SUPABASE_SERVICE_ROLE_KEY: Boolean(supabaseKey)
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET: read favorites
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("favorites")
        .select("id,name,lat,lon,created_at")
        .order("created_at", { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ favorites: data || [] });
    }

    // POST: insert favorite
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const name = (body?.name || "Favorite").toString().slice(0, 80);
      const lat = Number(body?.lat);
      const lon = Number(body?.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ error: "Invalid lat/lon" });
      }

      const { data, error } = await supabase
        .from("favorites")
        .insert([{ name, lat, lon }])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true, favorite: data });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: String(err) });
  }
};
