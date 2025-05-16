# stripe_webhook.py
from flask import Flask, request, jsonify
import json, uuid

app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    if data.get("type") == "checkout.session.completed":
        license = {
            "tier": "Pro",
            "token": str(uuid.uuid4()),
            "expires": "2026-01-01"
        }
        with open("license.json", "w") as f:
            json.dump(license, f, indent=2)
        return jsonify({"status": "license_issued"}), 200
    return "ignored", 200

if __name__ == "__main__":
    app.run(port=5050)