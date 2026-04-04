import axios from "axios";
import crypto from "crypto";

// --- Configuration ---
const FOTMOB_BASE_URL = "https://www.fotmob.com/api/";
const CACHE_EXPIRATION_MS = 1 * 60 * 1000; // 1 min pour les matchs
const cache = new Map();

// --- 1. Génération du header x-mas (reverse-engineered FotMob) ---
function generateXmasHeader() {
    const now = new Date();

    const day    = String(now.getUTCDate()).padStart(2, "0");
    const month  = String(now.getUTCMonth() + 1).padStart(2, "0");
    const hours  = String(now.getUTCHours()).padStart(2, "0");
    const minutes = String(now.getUTCMinutes()).padStart(2, "0");

    const dateStr = `${day}${month}${hours}${minutes}`;

    // Clé secrète statique utilisée par FotMob
    const secret = "cddcdd";
    const hash = crypto
        .createHmac("sha256", secret)
        .update(dateStr)
        .digest("hex");

    return `${dateStr}:${hash}`;
}

// --- 2. Instance Axios ---
const axiosInstance = axios.create({
    baseURL: FOTMOB_BASE_URL,
    timeout: 10000,
    headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
});

axiosInstance.interceptors.request.use((config) => {
    config.headers["x-mas"] = generateXmasHeader();
    return config;
});

// --- 3. Fetch du match ---
async function fetchMatchData(matchId) {
    const cacheKey = `match_${matchId}`;

    const cacheEntry = cache.get(cacheKey);
    if (cacheEntry && Date.now() < cacheEntry.timestamp + CACHE_EXPIRATION_MS) {
        console.log(`📦 Cache hit pour le match ${matchId}`);
        return cacheEntry.data;
    }

    const urlPath = `matchDetails?matchId=${matchId}&timeZone=Europe/Paris`;
    const response = await axiosInstance.get(urlPath);

    cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
    return response.data;
}

// --- 4. Handler Vercel ---
export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "L'ID du match est requis (?id=4829558)" });
    }

    try {
        const data = await fetchMatchData(id);
        return res.status(200).json(data);

    } catch (error) {
        const status = error.response?.status;
        console.error(`❌ Erreur API [${status || "N/A"}] pour matchId=${id}:`, error.message);

        if (status === 404) {
            return res.status(404).json({ error: "Match introuvable sur FotMob", matchId: id });
        }

        return res.status(status || 500).json({
            error: "Erreur lors de la récupération des données",
            details: error.message
        });
    }
}
