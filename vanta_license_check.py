# vanta_license_check.py
import json
from datetime import date

def check_license():
    try:
        with open("license.json") as f:
            license = json.load(f)
        print(f"License: {license['tier']} - Expires {license['expires']}")
        if date.fromisoformat(license["expires"]) < date.today():
            print("[🔴] License expired!")
        else:
            print("[✅] License valid.")
    except Exception:
        print("[⚠️] No valid license.json found.")

if __name__ == "__main__":
    check_license()