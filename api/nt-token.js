export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { userName, password, ntApiBase, bridgeSecret } = req.body || {};
    if (bridgeSecret !== process.env.BRIDGE_SECRET) return res.status(401).json({ error: "unauthorized" });
    if (!userName || !password) return res.status(400).json({ error: "missing creds" });

    const base = ntApiBase || "https://ecosystemapi.ninjatrader.com";

    const r = await fetch(base + "/v1/auth/testToken", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept":"application/json" },
      body: JSON.stringify({ userName, password, note: "risklock bridge" }),
    });

    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: "testToken failed", body: text });

    let bearer = text.trim();
    try {
      const j = JSON.parse(text);
      if (j?.userId && j?.userName && j?.accessToken) {
        bearer = `Bearer ${j.userId} ${j.userName} ${j.accessToken}`;
      }
    } catch {}
    if (!/^Bearer\s+\S+/.test(bearer)) return res.status(500).json({ error: "unexpected token", body: text });

    res.status(200).json({ bearer, ttlSeconds: 5400 }); // ~90 min
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
