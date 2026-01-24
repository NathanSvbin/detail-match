import axios from "axios";

// --- Configuration et Cache ---
const FOTMOB_BASE_URL = "https://www.fotmob.com/api/";
let xmasHeaderValue = undefined; 
const cache = new Map();
const CACHE_EXPIRATION_MS = 1 * 60 * 1000; // 1 minute pour les matchs en direct

// --- 1. Gestion du Token Dynamique ---
async function ensureXmasHeader() {
    if (xmasHeaderValue) return;
    try {
        const response = await axios.get("http://46.101.91.154:6006/", { timeout: 5000 });
        xmasHeaderValue = response.data["x-mas"];
        console.log("⚽ X-MAS Header sync success.");
    } catch (error) {
        console.error("❌ Failed to fetch x-mas header:", error.message);
        xmasHeaderValue = "default-fallback";
    }
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

axiosInstance.interceptors.request.use(async (config) => {
    await ensureXmasHeader();
    config.headers["x-mas"] = xmasHeaderValue;
    return config;
});

// --- 3. Logique de récupération du Match ---
async function fetchMatchDetails(matchId) {
    const urlPath = `matchDetails?matchId=${matchId}&timeZone=Europe/Paris`;
    
    // Check Cache
    const cacheEntry = cache.get(urlPath);
    if (cacheEntry && Date.now() < cacheEntry.timestamp + CACHE_EXPIRATION_MS) {
        return cacheEntry.data;
    }
    
    const response = await axiosInstance.get(urlPath);
    
    cache.set(urlPath, {
        data: response.data,
        timestamp: Date.now()
    });
    
    return response.data;
}

// --- 4. Handler Vercel ---
export default async function handler(req, res) {
    // Gestion CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "L'ID du match est requis (?id=4772687)" });
    }

    try {
        const data = await fetchMatchDetails(id);

        if (!data || Object.keys(data).length === 0) {
            return res.status(404).json({ error: "Match non trouvé" });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error(`Erreur Match ID ${id}:`, error.message);
        return res.status(500).json({ 
            error: "Erreur serveur", 
            details: error.message 
        });
    }
}
