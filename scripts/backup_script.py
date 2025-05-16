import argparse
import datetime
import logging
import os
import shutil
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DEFAULT_BACKUP_DIR_NAME = "_backups"
DEFAULT_EXCLUDE_PATTERNS = [
    ".git",
    ".venv",
    "__pycache__",
    "*.pyc",
    ".DS_Store",
    "build/",
    "dist/",
    "*.egg-info",
    "node_modules/",
    ".cache/",
    "*.log", # Exclude general log files from backup archives themselves
    DEFAULT_BACKUP_DIR_NAME # Exclude the backup directory itself
]

def create_backup_archive(project_path: Path, backup_id: str, instance_id: str) -> Path | None:
    """Creates a zip archive of the project directory, excluding specified patterns."""
    project_path = project_path.resolve()
    project_name = project_path.name
    
    # Create a unique backup name
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_name_base = f"{instance_id}_{project_name}_{backup_id}_{timestamp}"
    
    # Determine backup location (e.g., in a _backups directory outside the project_path)
    # For simplicity, let's put it in the parent of project_path, inside a _backups dir for that instance.
    # A more robust solution might use a central backup location.
    backup_root_dir = project_path.parent / f"{instance_id}_{DEFAULT_BACKUP_DIR_NAME}"
    backup_root_dir.mkdir(parents=True, exist_ok=True)
    
    archive_path_base = backup_root_dir / archive_name_base

    logger.info(f"Preparing backup for {project_path} to {archive_path_base}.zip")

    # We will create a temporary directory to copy files into, so we can exclude properly.
    temp_copy_dir = backup_root_dir / f"{archive_name_base}_temp_src"
    
    try:
        logger.info(f"Copying project tree to temporary location: {temp_copy_dir}")
        shutil.copytree(project_path, temp_copy_dir, ignore=shutil.ignore_patterns(*DEFAULT_EXCLUDE_PATTERNS))
        
        logger.info(f"Creating archive: {archive_path_base}.zip")
        archive_file_path = shutil.make_archive(
            base_name=str(archive_path_base),
            format='zip',
            root_dir=temp_copy_dir.parent, # Archive relative to parent of temp_copy_dir
            base_dir=temp_copy_dir.name    # The directory to archive
        )
        logger.info(f"Backup archive created successfully: {archive_file_path}")
        return Path(archive_file_path)
    except Exception as e:
        logger.exception(f"Error creating backup archive: {e}")
        return None
    finally:
        if temp_copy_dir.exists():
            logger.info(f"Removing temporary copy directory: {temp_copy_dir}")
            shutil.rmtree(temp_copy_dir)

def main():
    parser = argparse.ArgumentParser(description="Project backup and Git commit/push utility.")
    parser.add_argument("instance_id", type=str, help="An identifier for the instance or context of this project (e.g., 'dev_server', 'prod_instance_A').")
    parser.add_argument("project_path", type=Path, help="Path to the project directory to back up.")
    parser.add_argument("--backup-id", type=str, default="manual", help="A specific identifier for this backup operation (e.g., 'pre_refactor', 'nightly').")
    parser.add_argument("--commit", action="store_true", help="Commit all changes after backup.")
    parser.add_argument("--push", action="store_true", help="Push to remote after commit (implies --commit).")
    parser.add_argument("--backup-dir", type=Path, default=None, help=f"Optional: Specify a custom root directory for backups. Default is a '{DEFAULT_BACKUP_DIR_NAME}' directory in the parent of the project_path prefixed by instance_id.")

    args = parser.parse_args()

    if not args.project_path.is_dir():
        logger.error(f"Project path {args.project_path} is not a valid directory.")
        return

    logger.info(f"Starting backup process for instance '{args.instance_id}', project '{args.project_path.name}', backup_id '{args.backup_id}'")

    # 1. Create backup archive
    archive_file = create_backup_archive(args.project_path, args.backup_id, args.instance_id)
    if not archive_file:
        logger.error("Backup creation failed. Aborting further git operations.")
        return

    if args.push:
        args.commit = True # --push implies --commit

    if args.commit:
        logger.info("Proceeding with Git commit operations...")
        try:
            # Check if it's a git repository
            subprocess.run(["git", "-C", str(args.project_path), "rev-parse"], check=True, capture_output=True)
            logger.info(f"Project {args.project_path} is a Git repository.")

            # Add all changes
            logger.info("Staging all changes (git add .)")
            subprocess.run(["git", "-C", str(args.project_path), "add", "."], check=True)

            # Commit
            commit_message = f"Automated backup: {args.instance_id} - {args.backup_id} - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            logger.info(f"Committing with message: '{commit_message}'")
            subprocess.run(["git", "-C", str(args.project_path), "commit", "-m", commit_message], check=True)
            logger.info("Commit successful.")

            if args.push:
                logger.info("Pushing to remote...")
                subprocess.run(["git", "-C", str(args.project_path), "push"], check=True)
                logger.info("Push successful.")
        
        except FileNotFoundError:
            logger.error("Git command not found. Please ensure Git is installed and in your PATH.")
        except subprocess.CalledProcessError as e:
            logger.error(f"Git operation failed: {e}")
            if e.stderr:
                logger.error(f"Git stderr: {e.stderr.decode().strip()}")
            if e.stdout:
                logger.info(f"Git stdout: {e.stdout.decode().strip()}") # Log stdout as well for context
        except Exception as e:
            logger.exception(f"An unexpected error occurred during Git operations: {e}")
            
    logger.info("Backup process completed.")

if __name__ == "__main__":
    main() 