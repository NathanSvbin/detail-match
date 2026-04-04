import axios from "axios";

// --- Configuration ---
const FOTMOB_BASE_URL = "https://www.fotmob.com/api/";
const XMAS_SERVICE_URL = "http://46.101.91.154:6006/";
const CACHE_EXPIRATION_MS = 1 * 60 * 1000;       // 1 min pour les matchs
const XMAS_EXPIRATION_MS = 5 * 60 * 1000;         // 5 min pour le header x-mas

// --- État du header x-mas ---
let xmasHeaderValue = null;
let xmasHeaderTimestamp = 0;

// --- Cache des matchs ---
const cache = new Map();

// --- 1. Fetch du header x-mas avec expiration ---
async function fetchXmasHeader() {
    try {
        const response = await axios.get(XMAS_SERVICE_URL, { timeout: 5000 });
        xmasHeaderValue = response.data["x-mas"];
        xmasHeaderTimestamp = Date.now();
        console.log("⚽ X-MAS Header rafraîchi.");
    } catch (error) {
        console.error("❌ Impossible de récupérer le header x-mas:", error.message);
        // Si on n'a aucune valeur du tout, on lève l'erreur
        if (!xmasHeaderValue) throw new Error("Header x-mas indisponible");
        // Sinon on garde l'ancienne valeur en espérant qu'elle fonctionne encore
        console.warn("⚠️ Ancienne valeur x-mas conservée.");
    }
}

async function ensureXmasHeader(forceRefresh = false) {
    const isExpired = Date.now() > xmasHeaderTimestamp + XMAS_EXPIRATION_MS;
    if (forceRefresh || !xmasHeaderValue || isExpired) {
        await fetchXmasHeader();
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

// --- 3. Fetch du match avec retry si header périmé ---
async function fetchMatchData(matchId) {
    const cacheKey = `match_${matchId}`;
    
    // Vérification du cache
    const cacheEntry = cache.get(cacheKey);
    if (cacheEntry && Date.now() < cacheEntry.timestamp + CACHE_EXPIRATION_MS) {
        console.log(`📦 Cache hit pour le match ${matchId}`);
        return cacheEntry.data;
    }

    const urlPath = `matchDetails?matchId=${matchId}&timeZone=Europe/Paris`;

    try {
        const response = await axiosInstance.get(urlPath);
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        return response.data;

    } catch (error) {
        const status = error.response?.status;

        // Si FotMob rejette la requête à cause du header (401/403), on force le refresh et on retente une fois
        if (status === 401 || status === 403) {
            console.warn(`🔄 Header x-mas rejeté (${status}), refresh forcé et nouvelle tentative...`);
            await ensureXmasHeader(true);

            const retryResponse = await axiosInstance.get(urlPath);
            cache.set(cacheKey, { data: retryResponse.data, timestamp: Date.now() });
            return retryResponse.data;
        }

        throw error;
    }
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
