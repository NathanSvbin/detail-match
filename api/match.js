import axios from "axios";
import crypto from "crypto";

// --- Configuration ---
const FOTMOB_BASE_URL = "https://www.fotmob.com/api/";
const CACHE_MS = 60 * 1000; // 1 min

// --- Cache ---
const matchCache = new Map();

// --- Génération du header x-mas ---
function generateXmasHeader() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${pad(now.getUTCDate())}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
    const hash = crypto.createHmac("sha256", "cddcdd").update(dateStr).digest("hex");
    return `${dateStr}:${hash}`;
}

// --- Instance Axios FotMob ---
const fotmob = axios.create({
    baseURL: FOTMOB_BASE_URL,
    timeout: 10000,
    headers: {
        "Accept": "application/json",
        "Referer": "https://www.fotmob.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
});

// --- Fetch du match ---
async function fetchMatchData(matchId) {
    const cacheKey = `match_${matchId}`;
    const cached = matchCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
        console.log(`📦 Cache hit pour match ${matchId}`);
        return cached.data;
    }

    const url = `matchDetails?matchId=${matchId}&timeZone=Europe/Paris`;

    // Première tentative
    try {
        const response = await fotmob.get(url, {
            headers: { "x-mas": generateXmasHeader() }
        });
        matchCache.set(cacheKey, { data: response.data, expiry: Date.now() + CACHE_MS });
        return response.data;

    } catch (error) {
        const status = error.response?.status;

        // Header potentiellement rejeté → on retente une fois avec un header fraîchement généré
        if (status === 401 || status === 403) {
            console.warn(`⚠️ Header rejeté (${status}), nouvelle tentative...`);
            const response = await fotmob.get(url, {
                headers: { "x-mas": generateXmasHeader() }
            });
            matchCache.set(cacheKey, { data: response.data, expiry: Date.now() + CACHE_MS });
            return response.data;
        }

        throw error;
    }
}

// --- Handler Vercel ---
export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Paramètre manquant : ?id=4829558" });

    try {
        const data = await fetchMatchData(id);
        return res.status(200).json(data);
    } catch (error) {
        const status = error.response?.status;
        console.error(`❌ [${status ?? "ERR"}] matchId=${id} →`, error.message);

        if (status === 404) return res.status(404).json({ error: "Match introuvable", matchId: id });
        return res.status(status ?? 500).json({ error: error.message });
    }
}
