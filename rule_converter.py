# rule_converter.py — Converts Secrets Agent rules between YAML, Rego, SWRL, and DSL

import yaml
from pathlib import Path
import argparse

def parse_yaml_rule(file_path):
    with open(file_path) as f:
        return yaml.safe_load(f)

def convert_to_rego(rule):
    return f"""# Rego Policy
package secretsagent

default allow = false

allow {{
  input.path.contains("{rule.get('match', '').strip('*')}")
  input.env.{rule['header']['ENVS'][0]}
}}
"""

def convert_to_swrl(rule):
    tools = rule['header'].get('TOOLS', ['Tool'])
    env = rule['header'].get('ENVS', ['Env'])
    return f"""# SWRL
Resource(?x) ^ uses(?x, {tools[0]}) ^ requiresEnv(?x, {env[0]}) → AuthorizedAgent(?x)
"""

def convert_to_dsl(rule):
    return f"""# DSL
WHEN path matches "{rule['match']}" THEN
  USE {rule['header'].get('TOOLS', ['Tool'])[0]}
  REQUIRES ENV {rule['header'].get('ENVS', ['ENV'])[0]}
  RUN agent {rule['header'].get('AGENT', 'Agent')}
"""

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_file", help="Path to .rule.yaml file")
    parser.add_argument("--format", required=True, choices=["rego", "swrl", "dsl"], help="Target format")
    args = parser.parse_args()

    rule = parse_yaml_rule(args.input_file)

    if args.format == "rego":
        output = convert_to_rego(rule)
    elif args.format == "swrl":
        output = convert_to_swrl(rule)
    elif args.format == "dsl":
        output = convert_to_dsl(rule)
    else:
        output = "Unsupported format."

    output_file = Path(args.input_file).with_suffix(f".{args.format}")
    output_file.write_text(output.strip())
    print(f"[✔] Converted to {args.format}: {output_file}")

if __name__ == "__main__":
    main()