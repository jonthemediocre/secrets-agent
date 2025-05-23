#!/bin/bash
sed 's/\t/  /g' .sops.yaml | awk '{ sub(/\r$/, ""); print }' > .sops.yaml.tmp
mv .sops.yaml.tmp .sops.yaml
tail --bytes=+4 .sops.yaml > .sops.yaml.nobom && mv .sops.yaml.nobom .sops.yaml
echo "✅ Normalized .sops.yaml to UTF-8 (no BOM), LF, spaces only." 