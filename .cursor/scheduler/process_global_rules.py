import os
import glob
from ruamel.yaml import YAML
from ruamel.yaml.scanner import ScannerError

def extract_frontmatter_description(filepath):
    """
    Reads a file, extracts YAML frontmatter, and returns the description.
    Returns None if no frontmatter, no description, or if an error occurs.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        if not content.strip().startswith("---"):
            return None # No frontmatter

        parts = content.split("---", 2)
        if len(parts) < 3:
            return None # Malformed frontmatter

        frontmatter_str = parts[1]
        yaml = YAML(typ='safe')
        try:
            data = yaml.load(frontmatter_str)
            if isinstance(data, dict) and "description" in data:
                return str(data["description"])
            else:
                return None # No description field
        except ScannerError:
            # This can happen with complex or slightly malformed YAML
            # that ruamel.yaml (safe) might reject but is still parsable by other means
            # or if there's non-YAML content in the frontmatter block.
            # For this script, we'll consider it as "no parsable description".
            return "Error parsing YAML frontmatter."
        except Exception:
            return "Error processing YAML data."

    except FileNotFoundError:
        return "File not found."
    except Exception:
        return "Error reading file."

def process_rules_directory(rules_dir_path):
    """
    Processes all .md and .mdc files in the given directory.
    """
    print(f"Processing rules in: {rules_dir_path}\\n")
    
    # Ensure the path is absolute for glob to work reliably from any execution context
    if not os.path.isabs(rules_dir_path):
        rules_dir_path = os.path.abspath(rules_dir_path)

    # Using recursive glob to find files in subdirectories as well, if any.
    # If only top-level, '*.md*' would suffice.
    # For now, assuming rules are directly in .cursor/rules/
    md_files = glob.glob(os.path.join(rules_dir_path, "*.md"))
    mdc_files = glob.glob(os.path.join(rules_dir_path, "*.mdc"))
    
    all_files = sorted(list(set(md_files + mdc_files))) # Combine and remove duplicates, then sort

    if not all_files:
        print("No .md or .mdc files found in the directory.")
        return

    for filepath in all_files:
        filename = os.path.basename(filepath)
        description = extract_frontmatter_description(filepath)
        if description:
            if "Error" in description or "File not found" in description:
                 print(f"- {filename}: [ {description} ]")
            else:
                print(f"- {filename}: {description}")
        else:
            print(f"- {filename}: [ No description found in frontmatter ]")

if __name__ == "__main__":
    # Construct the path to .cursor/rules relative to this script's location
    # Script is in .cursor/scheduler/, so rules is one level up then into rules/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    rules_directory = os.path.join(script_dir, "..", "rules")
    
    process_rules_directory(rules_directory)
    print("\\nProcessing complete.") 