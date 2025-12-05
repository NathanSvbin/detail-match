// Fichier : api/match.js
import Fotmob from "@max-xoo/fotmob";

// Initialisation (peut causer des problèmes si elle est faite ici. 
// Laisser ici est généralement correct, mais nous allons ajouter des vérifications.)
const fotmob = new Fotmob();

export default async function handler(request, response) {
  const matchId = request.query.id;

  if (!matchId) {
    return response.status(400).json({
      success: false,
      message: "Paramètre manquant. Veuillez fournir un ID de match dans l'URL (ex: ?id=4772687)."
    });
  }

  // Vérification de la disponibilité de la librairie
  if (!fotmob || typeof fotmob.getMatchDetails !== 'function') {
      return response.status(500).json({
          success: false,
          message: "Erreur de configuration: La librairie Fotmob n'a pas été initialisée correctement."
      });
  }

  try {
    console.log(`Tentative de récupération des détails pour le match ID: ${matchId}`);
    
    // Tentative d'appel à l'API externe
    const matchDetails = await fotmob.getMatchDetails(matchId);

    if (!matchDetails || Object.keys(matchDetails).length === 0) {
        return response.status(404).json({
            success: false,
            message: `Match non trouvé ou données vides pour l'ID: ${matchId}.`
        });
    }

    // Réponse réussie
    response.status(200).json({
      success: true,
      matchId: matchId,
      data: matchDetails,
      source: "Fotmob API via Vercel Function"
    });

  } catch (error) {
    // Si l'erreur se produit ici, c'est que l'appel API a échoué.
    console.error(`Erreur critique lors de l'appel pour l'ID ${matchId}:`, error);

    // Retourner un message simple en cas d'erreur API externe pour éviter de crasher lors de la sérialisation
    response.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des données de l'API externe. Vérifiez si l'ID est valide ou si l'API est accessible.",
      // Fournir le message d'erreur si disponible, mais pas l'objet complet 'error'
      details: error.message || 'Erreur inconnue'
    });
  }
}
