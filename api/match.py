import curl_cffi.requests as tls_requests
import random
import time
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/match', methods=['GET'])
def get_match_details():
    match_id = request.args.get('id')

    if not match_id:
        return jsonify({"error": "Paramètre manquant : ?id=4829558"}), 400

    time.sleep(random.uniform(0.5, 1.5))

    try:
        res = tls_requests.get(
            f"https://www.fotmob.com/api/data/matchDetails?matchId={match_id}&timeZone=Europe/Paris",
            impersonate="chrome120",  # 👈 clé du contournement
            timeout=15
        )
        res.raise_for_status()
        return jsonify(res.json()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
