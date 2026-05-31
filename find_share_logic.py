import os

def find_share():
    path = r"C:\Users\abdul\.gemini\antigravity\scratch\tubeseekify\index_logic.js"
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    print("--- Searching for Share or Clipboard Copy Logic in index_logic.js ---")
    for idx, line in enumerate(lines):
        if "share" in line.lower() or "clipboard" in line.lower() or "copy" in line.lower() or "url" in line.lower():
            if "function" in line.lower() or "const" in line.lower() or "let" in line.lower() or "window.location" in line.lower() or "navigator" in line.lower():
                print(f"Line {idx+1}: {line.strip()[:120]}")

if __name__ == "__main__":
    find_share()
