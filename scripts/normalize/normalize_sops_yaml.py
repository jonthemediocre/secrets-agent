with open('.sops.yaml', 'rb') as f:
    content = f.read()

# Remove BOM if present
if content.startswith(b'\xef\xbb\xbf'):
    content = content[3:]

# Decode, replace tabs with spaces, normalize line endings
text = content.decode('utf-8').replace('\t', '  ').replace('\r\n', '\n').replace('\r', '\n')

with open('.sops.yaml', 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print("✅ Normalized .sops.yaml to UTF-8 (no BOM), LF, spaces only.") 