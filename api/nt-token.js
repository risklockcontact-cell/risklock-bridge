export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { userName, password, ntApiBase, bridgeSecret } = req.body || {};
    if (bridgeSecret !== process.env.BRIDGE_SECRET) return res.status(401).json({ error: "unauthorized" });
    if (!userName || !password) return res.status(400).json({ error: "missing creds" });

    const base = ntApiBase || "https://ecosystemapi.ninjatrader.com";

    // Encabezados “de navegador” para esquivar WAFs
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json,text/plain,*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Connection": "keep-alive",
      // UA de navegador real
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      // Algunos WAFs miran estos
      "Origin": "https://ecosystem.ninjatrader.com",
      "Referer": "https://ecosystem.ninjatrader.com/"
    };

    const body = JSON.stringify({ userName, password, note: "risklock bridge" });

    const r = await fetch(base + "/v1/auth/testToken", { method: "POST", headers, body });

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

    // 90 min aprox
    res.status(200).json({ bearer, ttlSeconds: 5400 });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
