"""
watcher_daemon.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import time

class ProjectChangeHandler(FileSystemEventHandler):
    def __init__(self, project_path):
        self.project_path = Path(project_path).resolve()

    def on_modified(self, event):
        if any(event.src_path.endswith(ext) for ext in [".md", ".py", ".yaml", ".yml"]):
            print(f"[⚡] Change detected in: {event.src_path}")
            subprocess.run(["python3", "cli.py", "bootstrap", str(self.project_path)])

def watch_project(project_path: str):
    project_path = Path(project_path).resolve()
    print(f"[👁️ ] Watching for changes in: {project_path}")
    event_handler = ProjectChangeHandler(project_path)
    observer = Observer()
    observer.schedule(event_handler, str(project_path), recursive=True)
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("project_path", type=str)
    args = parser.parse_args()
    watch_project(args.project_path)