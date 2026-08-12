import ipaddress
import socket
from urllib.parse import urlparse

import requests
from flask import request, jsonify

ALLOWED_SCHEMES = {"http", "https"}


def _resolves_to_public_ip(hostname: str) -> bool:
    for family, _, _, _, sockaddr in socket.getaddrinfo(hostname, None):
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False
    return True


@app.post("/api/fetch-preview")
def fetch_preview():
    parsed = urlparse(request.json["url"])
    if parsed.scheme not in ALLOWED_SCHEMES or not parsed.hostname:
        return jsonify({"error": "unsupported url"}), 400
    if not _resolves_to_public_ip(parsed.hostname):
        return jsonify({"error": "unsupported url"}), 400

    # redirects disabled so a 302 cannot bounce into the internal network
    resp = requests.get(parsed.geturl(), timeout=5, allow_redirects=False)
    return jsonify({"body": resp.text[:2000]})
