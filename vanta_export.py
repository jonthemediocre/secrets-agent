# vanta_export.py
import argparse, json, yaml
from pathlib import Path

def export_crewai():
    data = {
        "team": "CollapseOps",
        "agents": [
            {"name": "NotebookAgent", "tools": ["SummarizeNotebook"], "envs": ["OPENAI_API_KEY"]},
            {"name": "MeshBinder", "tools": ["CollapseMerger"], "envs": ["QDRANT_API_KEY"]}
        ]
    }
    Path("export/crewai.json").write_text(json.dumps(data, indent=2))

def export_sbom():
    data = {
        "secrets": ["OPENAI_API_KEY", "STRIPE_SECRET_KEY"],
        "tools": ["SummarizeNotebook", "CollapseMerger"],
        "apis": ["OpenAI", "Stripe", "Supabase"],
        "license": {"tier": "Pro", "token": "vnt-abc123", "expires": "2026-01-01"}
    }
    Path("export/sbom_license.json").write_text(json.dumps(data, indent=2))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", required=True)
    args = parser.parse_args()

    Path("export").mkdir(exist_ok=True)

    if args.format == "crewai":
        export_crewai()
    elif args.format == "sbom":
        export_sbom()
    else:
        print("Unknown format. Try: crewai | sbom")

if __name__ == "__main__":
    main()