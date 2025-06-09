# 🔐 Secrets Agent – Auth + Billing Integration Plan

---

## ✅ PHASE 1: Google OAuth2 CLI + Web Auth

### 🔑 Objectives:
- Allow login via `vanta auth login --google`
- Save access + refresh tokens to `.agent_auth.json`
- Optional Firebase/Google Identity Platform fallback

### 🔧 Steps:
1. Register app at Google Cloud Console
2. Create credentials (OAuth2 client)
3. In CLI:
    - `webbrowser.open(google_login_url)`
    - Flask mini server listens for callback
4. Save tokens:
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": "..."
}
```

---

## ✅ PHASE 2: Stripe Billing + Freemium License Keys

### 💸 Objectives:
- Allow upgrade via web portal
- Trigger Stripe checkout, webhook returns license token
- CLI can verify license:
```bash
vanta license check
```

### 🧩 Steps:
1. Create Stripe Product + Price tiers
2. Add webhook handler:
```python
@app.route("/webhook", methods=["POST"])
def stripe_hook():
    # validate + log checkout.session.completed
```
3. User receives:
```json
{
  "tier": "pro",
  "license": "vnt-abc123"
}
```
4. Save `license.json` and expose via API

---

## 🔐 CLI Features to Add:
```bash
vanta auth login --google
vanta license check
vanta license upgrade
```

---

## 📦 Dependencies:
- `google-auth`, `oauthlib`, `requests`
- `stripe`, `flask`, `dotenv`

---

## 🧬 Collapse Outcomes:
- Agent identity confirmed via Google token
- Tier-based logic bound to symbolic actions
- CLI can emit symbolic entitlement via `collapse_log.yaml`