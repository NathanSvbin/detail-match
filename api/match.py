import curl_cffi.requests as tls_requests
import random
import time
from flask import Flask, jsonify, request

FOTMOB_API = "https://www.fotmob.com/api"

app = Flask(__name__)

@app.route('/api/match', methods=['GET'])
def get_match_details():
    match_id = request.args.get('id')

    if not match_id:
        return jsonify({"error": "Paramètre manquant : ?id=4829558"}), 400

    time.sleep(random.uniform(1.0, 3.0))

    try:
        session = tls_requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        })

        res = session.get(
            f"{FOTMOB_API}/matchDetails?matchId={match_id}&timeZone=Europe/Paris",
            timeout=15
        )
        res.raise_for_status()
        return jsonify(res.json()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
