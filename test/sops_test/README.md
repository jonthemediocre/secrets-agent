# SOPS Test Directory

This directory contains:
- A sample encrypted file (to be generated)
- Instructions for decrypting and verifying SOPS setup

## To Encrypt a File

1. Place a file (e.g., `sample.yaml`) in this directory.
2. Run:
   ```sh
   sops -e --in-place sample.yaml
   ```

## To Decrypt a File

1. Run:
   ```sh
   sops -d sample.yaml > sample.decrypted.yaml
   ```

If decryption works, your SOPS/age setup is correct. 