# secrets_agent_launch_wizard.py

import json

def ask(question, example=None, optional=False):
    prompt = f"{question}"
    if example:
        prompt += f" (e.g., {example})"
    if optional:
        prompt += " [Optional]"
    prompt += ": "
    answer = input(prompt)
    return answer.strip() if answer else None

def run_wizard():
    config = {}

    print("\n🧬 Secrets Agent :: Launch Wizard v0.Δ")
    print("Answer these questions to set up your app, domain, and deployment.\n")

    config["owner_name"] = ask("1. What is your full name or business name", "Jon Vandergriff")
    config["email"] = ask("2. What email address should be used", "jon@example.com")

    config["preferred_domain"] = ask("3. Do you want to use 'secretsagent.com' or another domain", "secretsagent.com")
    config["domain_provider"] = ask("4. If already owned, what registrar is it with", "Namecheap, GoDaddy")

    print("\n5. Where do you want to host the site?")
    config["host"] = ask("Choose: netlify / vercel / github", "netlify")

    config["auto_bind_domain"] = ask("6. Do you want to auto-bind the domain if possible? (yes/no)", "yes")

    print("\n7. What should the website include?")
    config["pages"] = {
        "landing": True,
        "features": True,
        "screenshots": True,
        "pricing": ask("Include pricing page? (yes/no)", "yes") == "yes",
        "docs": True,
        "download": True
    }

    print("\n8. Deployment targets")
    config["targets"] = {
        "cli": True,
        "desktop": ask("Deploy Windows desktop GUI? (yes/no)", "yes") == "yes",
        "mobile": ask("Mobile apps (future)? (yes/no)", "no") == "yes"
    }

    config["api_keys"] = ask("9. AI API keys to pre-bind (comma separated)", "OpenAI, VANTA")

    config["auth"] = {
        "enable_google_cli": ask("10. Enable Google Auth in CLI? (yes/no)", "yes") == "yes",
        "enable_google_web": ask("Enable in web? (yes/no)", "yes") == "yes"
    }

    print("\n11. Infrastructure sync")
    config["sync"] = {
        "github_sync": True,
        "cron_updates": ask("Enable cron jobs for auto-update? (yes/no)", "no") == "yes"
    }

    config["github_account"] = ask("12. Preferred GitHub account/org for deployment", "vanta-systems")
    config["build_triggers"] = ask("13. Trigger builds on: push / collapse / schedule", "push")

    config["test_dashboard"] = ask("14. Enable deploy test dashboard? (yes/no)", "yes") == "yes"

    print("\n15. Branding confirmation")
    config["branding"] = {
        "name": "Secrets Agent",
        "domain": config["preferred_domain"],
        "style": "cyber-minimal-dark"
    }

    config["tagline"] = ask("16. Provide a brand message or tagline", "Collapse secrets. Link destiny.")

    # Save config
    out_path = "secrets_agent_launch_config.json"
    with open(out_path, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\n✅ Config saved to: {out_path}")
    print("🚀 You're ready to auto-deploy. Run: python deploy_stack.py --config secrets_agent_launch_config.json\n")

if __name__ == "__main__":
    run_wizard()