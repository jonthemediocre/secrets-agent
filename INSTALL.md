# Install MetaFabric

## Requirements
- Python 3.8+
- pip install watchdog pyyaml

## Run
```
python3 cli.py bootstrap test_project
```

## Setup Secrets
Create a file called `secrets.yaml`:
```yaml
OPENAI_API_KEY: your-key-here
```

## Output
- .env symlinked
- tools/ directory populated
- access_mesh.yaml + collapse_log.yaml updated

Use `vanta watch <project_path>` to auto-rescan on change.