# project_scanner.py
import os
import glob
import yaml
from pathlib import Path

def find_projects(root_path):
    return [f for f in Path(root_path).iterdir() if f.is_dir()]

def load_rules(rule_dir):
    rules = []
    for rule_file in Path(rule_dir).glob("*.yaml"):
        data = yaml.safe_load(Path(rule_file).read_text())
        rules.append(data)
    return rules

def match_rules(project_path, rules):
    matched_headers = []
    for rule in rules:
        pattern = rule.get("match")
        if pattern:
            full_pattern = str(project_path / pattern)
            matched = glob.glob(full_pattern, recursive=True)
            if matched:
                matched_headers.append(rule.get("header", {}))
    return matched_headers

def scan_projects_with_rules(root_path, rule_dir):
    print(f"[📁] Scanning root: {root_path}")
    projects = find_projects(root_path)
    rules = load_rules(rule_dir)
    results = {}

    for proj in projects:
        print(f"[🔍] Project: {proj.name}")
        matched = match_rules(proj, rules)
        results[proj.name] = matched
        for m in matched:
            print(f"  [✓] Rule matched: {m}")
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, help="Root projects folder")
    parser.add_argument("--rules", default="rules", help="Directory with YAML rule files")
    args = parser.parse_args()

    scan_projects_with_rules(args.root, args.rules)