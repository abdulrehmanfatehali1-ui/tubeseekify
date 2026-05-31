import re
import sys

def check_html_js_syntax(filename):
    print(f"=== Validating syntax for {filename} ===")
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple check for unmatched script tags
    matches = list(re.finditer(r'<script\b[^>]*>(.*?)</script>', content, re.DOTALL))
    print(f"Found {len(matches)} script blocks.")
    
    # We can write out the scripts to check they compile or have balanced braces/brackets
    for idx, match in enumerate(matches):
        script = match.group(1)
        # Find start and end line
        start_line = content[:match.start()].count('\n') + 1
        end_line = start_line + script.count('\n')
        print(f"Block {idx}: lines {start_line} to {end_line}")

        # We can do a simple balance count for braces, brackets, and parentheses
        
        # Remove single-line regex literals to prevent false positives on slashes/parentheses
        # We replace regexes like /.../g with empty string
        script_stripped = re.sub(r'/[^/\n]+/[gimuy]*', '', script)
        
        braces = 0
        brackets = 0
        parentheses = 0
        in_string = None
        escape = False
        
        for char_idx, char in enumerate(script_stripped):
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            
            if in_string:
                if char == in_string:
                    in_string = None
                continue
            
            if char in ["'", '"', '`']:
                in_string = char
                continue
                
            if char == '{':
                braces += 1
            elif char == '}':
                braces -= 1
                if braces < 0:
                    context = script[max(0, char_idx-100):char_idx+100]
                    print(f"Error: Unmatched closing brace '}}' in block {idx} around character {char_idx}")
                    print(f"Context:\n{context}")
                    return False
            elif char == '[':
                brackets += 1
            elif char == ']':
                brackets -= 1
                if brackets < 0:
                    context = script[max(0, char_idx-100):char_idx+100]
                    print(f"Error: Unmatched closing bracket ']' in block {idx} around character {char_idx}")
                    print(f"Context:\n{context}")
                    return False
            elif char == '(':
                parentheses += 1
            elif char == ')':
                parentheses -= 1
                if parentheses < 0:
                    context = script[max(0, char_idx-100):char_idx+100]
                    print(f"Error: Unmatched closing parenthesis ')' in block {idx} around character {char_idx}")
                    print(f"Context:\n{context}")
                    return False
        
        if braces != 0 or brackets != 0 or parentheses != 0:
            print(f"Warning/Error: Block {idx} balance status:")
            print(f"  Braces balance: {braces}")
            print(f"  Brackets balance: {brackets}")
            print(f"  Parentheses balance: {parentheses}")
            # print a snippet around where it might be unbalanced
            snippet = script[-200:]
            print(f"  Snippet: ... {snippet}")
            return False
            
    print("ALL SCRIPT BLOCKS ARE SYNTAX-BALANCED! SUCCESS!")
    return True

if __name__ == '__main__':
    check_html_js_syntax('index.html')
