# build_windows_exe.py
# Build GUI launcher into standalone Windows .exe
import PyInstaller.__main__

PyInstaller.__main__.run([
    'windows_gui_launcher.py',
    '--onefile',
    '--windowed',
    '--icon=assets/logo.ico',
    '--name=SecretsAgent'
])