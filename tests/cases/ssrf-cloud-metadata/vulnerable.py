import requests
from flask import request, jsonify


@app.post("/api/fetch-preview")
def fetch_preview():
    url = request.json["url"]
    # Reaches 169.254.169.254 and any internal service.
    resp = requests.get(url, timeout=5)
    return jsonify({"body": resp.text[:2000]})
