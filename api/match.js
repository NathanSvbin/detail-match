import Fotmob from "@max-xoo/fotmob";

const fotmob = new Fotmob();

const cache = new Map();
const CACHE_MS = 60 * 1000; // 1 min

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Paramètre manquant : ?id=4829558" });

    const cached = cache.get(id);
    if (cached && Date.now() < cached.expiry) {
        return res.status(200).json(cached.data);
    }

    try {
        const data = await fotmob.getMatchDetails(id);
        cache.set(id, { data, expiry: Date.now() + CACHE_MS });
        return res.status(200).json(data);
    } catch (error) {
        console.error(`❌ matchId=${id} →`, error.message);
        return res.status(500).json({ error: error.message });
    }
}
