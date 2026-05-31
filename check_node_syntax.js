const fs = require('fs');
const vm = require('vm');

function validate() {
    console.log("=== Node.js V8 Compilation Validator ===");
    const html = fs.readFileSync('index.html', 'utf8');
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let index = 0;
    let hasError = false;
    
    while ((match = scriptRegex.exec(html)) !== null) {
        const js = match[1];
        if (!js.trim()) continue;
        
        index++;
        // Skip external script tags
        if (match[0].includes('src=')) {
            console.log(`Block ${index}: Skip (External)`);
            continue;
        }
        
        try {
            new vm.Script(js);
            console.log(`Block ${index}: OK (Parsed successfully)`);
        } catch (e) {
            hasError = true;
            console.error(`Block ${index}: ERROR!`);
            console.error(e.message);
            // Print line numbers in context
            const lines = js.split('\n');
            const errLine = e.stack.split('\n')[0].match(/:(\d+)/);
            const lineNum = errLine ? parseInt(errLine[1], 10) : 0;
            console.log("Context around error:");
            for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
                console.log(`${i+1}: ${lines[i]}`);
            }
        }
    }
    
    if (hasError) {
        process.exit(1);
    } else {
        console.log("ALL JS BLOCKS ARE 100% SYNTAX VALID!");
    }
}

validate();
