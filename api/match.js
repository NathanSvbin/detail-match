// Fichier : api/match.js
// Récupère les détails d'un match en utilisant votre propre classe Fotmob (avec gestion du header x-mas)

import axios from "axios";

class Fotmob {
    constructor() {
        this.cache = new Map();
        this.xmas = undefined;
        // Utilisez le chemin d'accès correct à l'API Fotmob
        this.baseUrl = "https://www.fotmob.com/api/"; 
        
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 10000,
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        // Intercepteur pour ajouter le header x-mas avant chaque requête
        this.axiosInstance.interceptors.request.use(async (config) => {
            // C'est votre logique de contournement du header x-mas
            if (!this.xmas) {
                await this.ensureInitialized();
            }
            config.headers["x-mas"] = this.xmas;
            return config;
        });
    }

    async ensureInitialized() {
        if (!this.xmas) {
            // Appel à votre proxy pour obtenir le header x-mas
            const response = await axios.get("http://46.101.91.154:6006/");
            this.xmas = response.data["x-mas"];
        }
    }

    async safeTypeCastFetch(url) {
        // Logique de cache
        if (this.cache.has(url)) {
            return JSON.parse(this.cache.get(url));
        }
        
        const response = await this.axiosInstance.get(url);
        this.cache.set(url, JSON.stringify(response.data));
        return response.data;
    }

    // NOUVELLE MÉTHODE : Récupère les détails d'un match
    async getMatchDetails(id, timeZone = "Europe/London") {
        // L'endpoint pour les détails de match est 'matchDetails?matchId='
        const url = `matchDetails?matchId=${id}&timeZone=${timeZone}`; 
        return await this.safeTypeCastFetch(url);
    }
    
    // Ancien getTeam (inclus pour référence)
    async getTeam(id, tab = "overview", type = "team", timeZone = "Europe/London") {
        const url = `teams?id=${id}&tab=${tab}&type=${type}&timeZone=${timeZone}`;
        return await this.safeTypeCastFetch(url);
    }
}

// ---------------------------------------------------
// HANDLER VERSION VERCEL 🌟
// ---------------------------------------------------
export default async function handler(req, res) {
    // Le handler Vercel doit utiliser le nom 'req' pour la requête et 'res' pour la réponse.
    const matchId = req.query.id;

    if (!matchId) {
        return res.status(400).json({ 
            success: false,
            message: "Paramètre manquant. Veuillez fournir un ID de match dans l'URL (ex: ?id=4772687)."
        });
    }

    try {
        // 1. Initialiser votre classe Fotmob personnalisée
        const fotmob = new Fotmob();
        
        // 2. Appeler la nouvelle méthode getMatchDetails
        const data = await fotmob.getMatchDetails(matchId);

        // Gérer le cas où l'ID n'existe pas
        if (!data || Object.keys(data).length === 0) {
             return res.status(404).json({
                success: false,
                message: `Match non trouvé pour l'ID: ${matchId}.`
            });
        }
        
        return res.status(200).json({
            success: true,
            matchId: matchId,
            data: data
        });

    } catch (err) {
        // Ceci capturera les erreurs liées à l'initialisation du header x-mas ou à la requête finale.
        console.error(`Erreur pour l'ID ${matchId}:`, err);
        return res.status(500).json({ 
            success: false,
            message: "Erreur interne lors de la récupération des détails du match.",
            details: err.message
        });
    }
}
