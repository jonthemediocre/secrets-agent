# windows_gui_launcher.py – Simple Windows desktop app for Secrets Agent CLI

import tkinter as tk
from tkinter import filedialog, scrolledtext
from subprocess import Popen, PIPE

def run_command(cmd, output_box):
    process = Popen(cmd, stdout=PIPE, stderr=PIPE, shell=True, text=True)
    stdout, stderr = process.communicate()
    output_box.delete('1.0', tk.END)
    output_box.insert(tk.END, stdout)
    if stderr:
        output_box.insert(tk.END, "\n[stderr]\n" + stderr)

def select_folder():
    path = filedialog.askdirectory()
    if path:
        run_command(f"python project_scanner.py --root \"{path}\" --rules rules", output)

root = tk.Tk()
root.title("Secrets Agent Launcher")
root.geometry("720x500")

frame = tk.Frame(root)
frame.pack(pady=10)

tk.Button(frame, text="🔍 Scan", width=20, command=lambda: run_command("python cli.py scan", output)).grid(row=0, column=0)
tk.Button(frame, text="🔐 Link Secrets", width=20, command=lambda: run_command("python cli.py link", output)).grid(row=0, column=1)
tk.Button(frame, text="📦 Deploy", width=20, command=lambda: run_command("python deploy_stack.py", output)).grid(row=0, column=2)
tk.Button(frame, text="🧪 Run Tests", width=20, command=lambda: run_command("python test_runner.py", output)).grid(row=1, column=0)
tk.Button(frame, text="📂 Scan Folder", width=20, command=select_folder).grid(row=1, column=1)
tk.Button(frame, text="🛑 Quit", width=20, command=root.destroy).grid(row=1, column=2)

output = scrolledtext.ScrolledText(root, wrap=tk.WORD, width=100, height=25)
output.pack(pady=10)

root.mainloop()