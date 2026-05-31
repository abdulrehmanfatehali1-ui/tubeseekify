const { JSDOM } = require("jsdom");
const https = require("https");

const url = "https://storage.googleapis.com/safepayobjects/api/safepay-checkout.min.js";

https.get(url, (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
        const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="container"></div></body></html>`, {
            runScripts: "dangerously"
        });
        
        // Inject script into JSDOM window
        const scriptEl = dom.window.document.createElement("script");
        scriptEl.textContent = data;
        dom.window.document.head.appendChild(scriptEl);
        
        const safepay = dom.window.safepay;
        console.log("safepay object keys:", Object.keys(safepay || {}));
        if (safepay && safepay.Button) {
            console.log("safepay.Button is typeof:", typeof safepay.Button);
            console.log("safepay.Button keys:", Object.keys(safepay.Button));
            console.log("safepay.Button.render function:", safepay.Button.render ? "Yes" : "No");
            
            // Try instantiating it
            try {
                const btn = safepay.Button({
                    env: "sandbox",
                    client: { sandbox: "test" }
                });
                console.log("Instantiated Button keys:", Object.keys(btn));
                console.log("Instance render function:", typeof btn.render);
            } catch (e) {
                console.log("Instantiating failed:", e.message);
            }
        } else {
            console.log("safepay.Button not found on window");
        }
        process.exit(0);
    });
}).on("error", (err) => {
    console.error("HTTP Error:", err.message);
});
