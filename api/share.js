module.exports = (req, res) => {
    // 1. Read query parameters passed from frontend share button
    const { id, title, img, desc } = req.query;

    const safeTitle = title ? decodeURIComponent(title) : "TubeSeekify";
    const safeImg = img ? decodeURIComponent(img) : "https://i.postimg.cc/C1ppGZh3/Gemini-Generated-Image-c2b4vrc2b4vrc2b4-(1)-Picsart-Background-Remover.png";
    const safeDesc = desc ? decodeURIComponent(desc) : "Hub for AI content creation, premium GPT prompts, and AI tools.";
    
    // Convert slug/id for redirection
    const redirectUrl = `https://tubeseekify.online/#${id || "home"}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // 2. Return a lightweight, fully optimized HTML shell with Open Graph meta tags for WhatsApp
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safeTitle} | TubeSeekify</title>
    
    <!-- Open Graph tags for WhatsApp / Facebook / Social Crawlers -->
    <meta property="og:site_name" content="TubeSeekify">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDesc}">
    <meta property="og:image" content="${safeImg}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://tubeseekify.online/api/share?id=${id || ''}">
    
    <!-- Image dimension indicators for instant scraper display -->
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">

    <!-- Twitter Card metadata -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDesc}">
    <meta name="twitter:image" content="${safeImg}">

    <script>
        // Redirect the user immediately to the main SPA post hash route
        window.location.href = "${redirectUrl}";
    </script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #060913;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            max-width: 400px;
            padding: 24px;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        h2 { font-size: 18px; margin: 0 0 8px; font-weight: 800; }
        p { font-size: 13px; color: #94a3b8; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2>Redirecting to TubeSeekify...</h2>
        <p>You are being redirected to: ${safeTitle}</p>
    </div>
</body>
</html>
`);
};
