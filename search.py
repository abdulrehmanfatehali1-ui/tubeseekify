import re
import sys

if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def search_file(filename, pattern):
    print(f"=== Searching {filename} for '{pattern}' ===")
    with open(filename, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    count = 0
    for idx, line in enumerate(lines):
        if re.search(pattern, line, re.IGNORECASE):
            print(f"{idx+1}: {line.strip()[:120]}")
            count += 1
            if count >= 45:
                print("... truncated ...")
                break

search_file('admin.html', 'MacroDroid')
search_file('admin.html', 'Emulator')






