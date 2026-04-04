import curl_cffi.requests as tls_requests
from flask import Flask, jsonify, request
import time
import random

FOTMOB_API = "https://www.fotmob.com/api"
LOGGER = print

class FotMobMatchScraper:
    def __init__(self, match_id: str):
        self.match_id = match_id
        self.session = self._init_session()

    def _init_session(self):
        session = tls_requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        })
        return session

    def fetch_match_details(self) -> dict:
        url = f"{FOTMOB_API}/matchDetails?matchId={self.match_id}&timeZone=Europe/Paris"
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            LOGGER(f"❌ Erreur critique pour le match {self.match_id}: {e}")
            return {"debug_error": str(e)}  # 👈 retourne l'erreur au lieu de {}

app = Flask(__name__)

@app.route('/api/match', methods=['GET'])
def get_match_details():
    match_id = request.args.get('id')

    delay = random.uniform(1.0, 3.0)
    time.sleep(delay)

    if not match_id:
        return jsonify({"error": "Paramètre manquant : ?id=4829558"}), 400

    try:
        scraper = FotMobMatchScraper(match_id)
        json_data = scraper.fetch_match_details()

        return jsonify(json_data), 200

    except Exception:
        LOGGER("Erreur fatale de l'application Flask.")
        return jsonify({"error": "Erreur interne du serveur."}), 500
