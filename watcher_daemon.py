"""
watcher_daemon.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import time
import logging
import os

# Configure logging
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO),
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProjectChangeHandler(FileSystemEventHandler):
    def __init__(self, project_path):
        self.project_path = Path(project_path).resolve()

    def on_modified(self, event):
        if any(event.src_path.endswith(ext) for ext in [".md", ".py", ".yaml", ".yml"]):
            logger.info(f"Change detected in: {event.src_path}")
            try:
                logger.info(f"Running bootstrap for project: {self.project_path}")
                result = subprocess.run(
                    ["python3", "cli.py", "bootstrap", str(self.project_path)],
                    capture_output=True, text=True, check=False # check=False to capture stderr
                )
                if result.returncode == 0:
                    logger.info(f"Bootstrap successful for {self.project_path}. Output:\n{result.stdout}")
                else:
                    logger.error(f"Bootstrap failed for {self.project_path}. Error:\n{result.stderr}")
            except Exception as e:
                logger.exception(f"Error running bootstrap for {self.project_path}: {e}")

def watch_project(project_path: str):
    project_path_resolved = Path(project_path).resolve()
    logger.info(f"Initializing watcher for changes in: {project_path_resolved}")
    event_handler = ProjectChangeHandler(project_path_resolved)
    observer = Observer()
    observer.schedule(event_handler, str(project_path_resolved), recursive=True)
    observer.start()
    logger.info(f"Watcher started for {project_path_resolved}. Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received, stopping watcher.")
        observer.stop()
    except Exception as e:
        logger.exception(f"Watcher loop encountered an error: {e}") # Log other exceptions too
        observer.stop()
    finally:
        observer.join()
        logger.info(f"Watcher stopped for {project_path_resolved}.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Watch a project directory for changes and run bootstrap.")
    parser.add_argument("project_path", type=str, help="The path to the project directory to watch.")
    args = parser.parse_args()
    watch_project(args.project_path)