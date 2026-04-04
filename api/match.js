import axios from "axios";

// --- Configuration ---
const FOTMOB_BASE_URL = "https://www.fotmob.com/api/";
const XMAS_SERVICE_URL = "http://46.101.91.154:6006/";
const CACHE_MATCH_MS = 60 * 1000;      // 1 min pour les données match
const CACHE_XMAS_MS  = 4 * 60 * 1000; // 4 min pour le header (il tourne toutes les 5 min)

// --- État global ---
const matchCache = new Map();
let xmasValue = null;
let xmasExpiry = 0;

// --- 1. Header x-mas avec expiration stricte ---
async function getXmasHeader(forceRefresh = false) {
    const isStale = Date.now() >= xmasExpiry;

    if (!forceRefresh && xmasValue && !isStale) {
        return xmasValue;
    }

    console.log(`🔄 Fetch x-mas header (force=${forceRefresh}, stale=${isStale})`);

    const response = await axios.get(XMAS_SERVICE_URL, { timeout: 5000 });
    xmasValue  = response.data["x-mas"];
    xmasExpiry = Date.now() + CACHE_XMAS_MS;

    console.log("✅ x-mas header mis à jour.");
    return xmasValue;
}

// --- 2. Instance Axios FotMob ---
const fotmob = axios.create({
    baseURL: FOTMOB_BASE_URL,
    timeout: 10000,
    headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
});

// --- 3. Fetch du match (avec retry sur 401/403) ---
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
        const xmas = await getXmasHeader();
        const response = await fotmob.get(url, {
            headers: { "x-mas": xmas }
        });

        matchCache.set(cacheKey, {
            data: response.data,
            expiry: Date.now() + CACHE_MATCH_MS
        });

        return response.data;

    } catch (error) {
        const status = error.response?.status;

        // Header rejeté → on force le refresh et on retente une seule fois
        if (status === 401 || status === 403) {
            console.warn(`⚠️ Header rejeté (${status}), refresh forcé...`);

            const freshXmas = await getXmasHeader(true);
            const retry = await fotmob.get(url, {
                headers: { "x-mas": freshXmas }
            });

            matchCache.set(cacheKey, {
                data: retry.data,
                expiry: Date.now() + CACHE_MATCH_MS
            });

            return retry.data;
        }

        // Autre erreur → on laisse remonter
        throw error;
    }
}

// --- 4. Handler Vercel ---
export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "Paramètre manquant : ?id=4829558" });
    }

    try {
        const data = await fetchMatchData(id);
        return res.status(200).json(data);

    } catch (error) {
        const status = error.response?.status;
        console.error(`❌ [${status ?? "ERR"}] matchId=${id} →`, error.message);

        if (status === 404) {
            return res.status(404).json({ error: "Match introuvable sur FotMob", matchId: id });
        }

        // Service x-mas down
        if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
            return res.status(503).json({ error: "Service x-mas indisponible", details: error.message });
        }

        return res.status(status ?? 500).json({
            error: "Erreur lors de la récupération des données",
            details: error.message
        });
    }
}
