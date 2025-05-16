# 🧭 Secrets Agent Launch Plan

## 🎯 Objectives
- Publish public GitHub repo
- Deploy web and docs via Netlify
- Activate Stripe webhook to issue licenses
- Prepare for ProductHunt + IndieHackers launch

---

## ✅ Action Map

1. 🐙 GitHub: Run `bash push_repo.sh`
2. 🌐 Netlify: Connect to repo → deploy `landing_site/`
3. 💳 Stripe:
    - Add webhook to `/webhook`
    - Use `stripe_webhook.py`
4. 🧪 Run `vanta_license_check.py` to validate
5. 📦 Build `.exe` via `build_windows_exe.py`

---

## 📰 Launch Channels

- ProductHunt
- IndieHackers
- Dev.to article
- YouTube demo