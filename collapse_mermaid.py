from pathlib import Path
import yaml

def collapse_log_to_mermaid(log_path: Path, output_path: Path):
    if not log_path.exists():
        raise FileNotFoundError("collapse_log.yaml not found")

    log = yaml.safe_load(log_path.read_text())
    nodes = []
    edges = []

    for entry in log.get("history", []):
        version = entry["version"]
        summary = entry.get("summary", "no summary").strip()
        label = f"{version}:::node\n{summary}"
        nodes.append(f'{version}["{label}"]')

    for i in range(len(nodes) - 1):
        edges.append(f'{log["history"][i]["version"]} --> {log["history"][i + 1]["version"]}')

    diagram = "graph TD\n" + "\n".join(nodes + edges)
    output_path.write_text(diagram)
    print("[✓] Mermaid diagram generated.")

if __name__ == "__main__":
    collapse_log_to_mermaid(Path("collapse_log.yaml"), Path("collapse_log.mmd"))