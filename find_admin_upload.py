import os

def find_upload():
    dir_path = r"C:\Users\abdul\.gemini\antigravity\scratch\tubeseekify"
    files = ["admin_logic.js", "admin.html"]
    
    for file in files:
        full_path = os.path.join(dir_path, file)
        if not os.path.exists(full_path):
            continue
        print(f"\n==================== {file} ====================")
        with open(full_path, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f.readlines()):
                if "upload" in line.lower() or "file" in line.lower() or "imgbb" in line.lower() or "reader" in line.lower() or "canvas" in line.lower():
                    print(f"Line {idx+1}: {line.strip()[:120]}")

if __name__ == "__main__":
    find_upload()
