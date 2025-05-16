# Secrets Agent Installer Blueprint

## Build Instructions (Windows)
1. Install pyinstaller: `pip install pyinstaller`
2. Run: `pyinstaller installer/vanta.spec`
3. Output: `dist/vanta.exe`

## Assets Included:
- CLI binding engine
- Logo icon
- secrets.yaml

## Optional Enhancements:
- Add code signing for Windows
- Build Mac DMG or Linux AppImage with appropriate scripts