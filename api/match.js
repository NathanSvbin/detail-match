// Fichier : api/match.js
// Endpoint d'API pour récupérer les détails d'un match (ex: /api/match?id=4772687)

import Fotmob from "@max-xoo/fotmob";

// Initialisation de la librairie Fotmob
const fotmob = new Fotmob();

export default async function handler(request, response) {
  // 1. Récupérer l'ID du match depuis le paramètre 'id' de l'URL
  const matchId = request.query.id;

  // 2. Vérification de la présence de l'ID
  if (!matchId) {
    return response.status(400).json({
      success: false,
      message: "Paramètre manquant. Veuillez fournir un ID de match dans l'URL (ex: ?id=4772687)."
    });
  }

  try {
    // 3. Appel de la méthode getMatchDetails avec l'ID fourni
    console.log(`Tentative de récupération des détails pour le match ID: ${matchId}`);
    const matchDetails = await fotmob.getMatchDetails(matchId);

    // 4. Vérifier si les données sont vides ou si le match n'existe pas
    if (!matchDetails || Object.keys(matchDetails).length === 0) {
        return response.status(404).json({
            success: false,
            message: `Match non trouvé pour l'ID: ${matchId}.`
        });
    }

    // 5. Répondre avec les données JSON
    response.status(200).json({
      success: true,
      matchId: matchId,
      data: matchDetails,
      source: "Fotmob API via Vercel Function"
    });

  } catch (error) {
    // 6. Gérer les erreurs API ou de connexion
    console.error(`Erreur pour l'ID ${matchId}:`, error);
    response.status(500).json({
      success: false,
      message: `Erreur interne lors de l'appel à l'API Fotmob pour l'ID ${matchId}.`,
      error: error.message
    });
  }
}
