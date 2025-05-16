# deploy_stack.py (expanded)

import json
import subprocess
from pathlib import Path

def load_config(config_path):
    with open(config_path, 'r') as f:
        return json.load(f)

def deploy_site(host, site_path):
    if not Path(site_path).exists():
        print(f"[X] Directory not found: {site_path}")
        return
    if host == "netlify":
        subprocess.run(["netlify", "deploy", "--dir", site_path, "--prod"])
    elif host == "vercel":
        subprocess.run(["vercel", "--prod", "--cwd", site_path])
    else:
        print(f"[X] Unsupported host: {host}")

def bind_domain(host, domain):
    if host == "netlify":
        subprocess.run(["netlify", "dns", "import", domain])
    elif host == "vercel":
        subprocess.run(["vercel", "domains", "add", domain])
    else:
        print(f"[X] Cannot bind domain for host: {host}")

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="secrets_agent_launch_config.json", help="Path to launch config")
    args = parser.parse_args()

    config = load_config(args.config)
    host = config.get("host")

    print("🚀 Launching Secrets Agent Deployment Stack...")

    # Deploy docs_site/
    if Path("docs_site").exists():
        print("[📘] Deploying docs site...")
        deploy_site(host, "docs_site")

    # Deploy landing_site/
    if Path("landing_site").exists():
        print("[💡] Deploying marketing site...")
        deploy_site(host, "landing_site")

    # Bind domain
    if config.get("auto_bind_domain", "").lower() == "yes":
        print("[🌐] Attempting domain binding...")
        bind_domain(host, config["preferred_domain"])

    print("✅ Deployment sequence completed.")

if __name__ == "__main__":
    main()