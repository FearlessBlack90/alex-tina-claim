// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = "supersecret123"; // <-- change this to your own secret key
const TOKENS_FILE = path.join(__dirname, "tokens.json");

// Ensure tokens.json exists
if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, JSON.stringify({ tokens: {} }));

function readTokens() {
  return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf8"));
}
function writeTokens(obj) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(obj, null, 2), "utf8");
}

// Admin page
app.get("/admin", (req, res) => {
  const key = req.query.key;
  if (key !== ADMIN_KEY) return res.status(401).send("Unauthorized");

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Admin - Generate Tokens</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; background: #111; color: #ffd700; }
      input, button { padding: 10px; font-size: 16px; margin: 5px; }
      button { cursor: pointer; background: gold; border: none; border-radius: 5px; }
      .link-box { margin-top: 20px; }
      .link-box a { color: #0ff; text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>Admin Panel</h1>
    <label>Number of tokens to generate:</label>
    <input type="number" id="count" value="1" min="1" max="100">
    <button onclick="generate()">Generate Token & Claim Link</button>
    <div class="link-box" id="links"></div>

    <script>
      async function generate() {
        const count = document.getElementById("count").value || 1;
        const res = await fetch('/admin/create?key=${ADMIN_KEY}&count=' + count);
        const data = await res.json();
        const linksDiv = document.getElementById("links");
        linksDiv.innerHTML = "";
        data.tokens.forEach(t => {
          const link = document.createElement('div');
          link.innerHTML = '<a href="/claim?token=' + t + '" target="_blank">' + window.location.origin + '/claim?token=' + t + '</a>';
          linksDiv.appendChild(link);
        });
      }
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Admin route to generate tokens (used by admin page)
app.get("/admin/create", (req, res) => {
  const { key, count = "1" } = req.query;
  if (key !== ADMIN_KEY) return res.status(401).send("Unauthorized");

  const n = Math.max(1, Math.min(parseInt(count, 10) || 1, 1000));
  const store = readTokens();
  const newTokens = [];

  for (let i = 0; i < n; i++) {
    const t = crypto.randomBytes(16).toString("base64url");
    store.tokens[t] = false;
    newTokens.push(t);
  }
  writeTokens(store);
  res.json({ created: newTokens.length, tokens: newTokens });
});

// Claim page
app.get("/claim", (req, res) => {
  const token = (req.query.token || "").trim();
  if (!token) return res.status(400).send("❌ Invalid link (missing token).");

  const store = readTokens();
  if (!(token in store.tokens)) return res.status(400).send("❌ Invalid link.");
  if (store.tokens[token] === true) return res.status(403).send("❌ This link has already been used.");

  store.tokens[token] = true; // mark as used
  writeTokens(store);

  // Casino-themed claim page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claim</title>
<style>
  body { margin:0; min-height:100vh; font-family: Arial, sans-serif;
         display:flex; justify-content:center; align-items:center; background: radial-gradient(circle at top, #222, #000); overflow:hidden; position:relative; }
  .bubble {
    width: 80px; height: 80px; border-radius:50%;
    display:flex; justify-content:center; align-items:center;
    font-weight:bold; color:white;
    background: radial-gradient(circle at 30% 30%, rgba(255,215,0,0.8), rgba(255,165,0,0.5));
    border: 2px solid #fff8; box-shadow: 0 4px 15px rgba(255,215,0,0.5);
    position:absolute; font-size:1.2rem; user-select:none; pointer-events:none; animation: floatBubble linear infinite;
  }
  @keyframes floatBubble { 0%{transform:translateY(0px);}50%{transform:translateY(-30px);}100%{transform:translateY(0px);} }

  .center-bubble {
    width: 150px; height:150px; border-radius:50%;
    background: linear-gradient(145deg,#ffd700,#ffa500);
    border:5px solid #fff; display:flex; justify-content:center; align-items:center;
    font-size: 1.5rem; color:#fff; font-weight:bold; text-align:center;
    box-shadow:0 0 30px #fff8,0 0 60px gold;
    position:relative; cursor:pointer;
  }

  .center-card {
    position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);
    background: rgba(0,0,0,0.85); border-radius:20px; padding:40px; text-align:center;
    display:none; z-index:10;
  }
  .center-card h1 { font-size:42px; color:#ffd700; margin:0 0 12px; text-shadow:0 0 10px #fff,0 0 20px #ff6600; }
  .center-card p { color:#fff; font-size:18px; }
  .center-card small { display:block; margin-top:8px; color:#ffcc66; }
</style>
</head>
<body>
<div class="center-bubble" id="mainBubble">CLAIM</div>
<div class="center-card" id="popup">
  <h1>🎉 Congratulations! 🎉</h1>
  <p>You’ve claimed your 30% Bonus.</p>
  <small>This link is now expired.</small>
</div>
<script>
  const bonuses = [40,50,60,70,80,90,100];
  const body = document.body;
  const centerX = window.innerWidth/2;
  const centerY = window.innerHeight/2;
  bonuses.forEach((b)=>{
    const bubble=document.createElement('div');
    bubble.className='bubble';
    bubble.textContent=b+'%';
    const angle=Math.random()*2*Math.PI;
    const radius=180+Math.random()*100;
    const x=centerX+radius*Math.cos(angle)-40;
    const y=centerY+radius*Math.sin(angle)-40;
    bubble.style.left=x+'px';
    bubble.style.top=y+'px';
    bubble.style.animationDuration=(4+Math.random()*3)+'s';
    body.appendChild(bubble);
  });

  const mainBubble=document.getElementById('mainBubble');
  const popup=document.getElementById('popup');
  mainBubble.addEventListener('click',()=>{
    mainBubble.style.transform='scale(1.5)';
    mainBubble.style.transition='transform 0.5s';
    setTimeout(()=>{mainBubble.style.display='none'; popup.style.display='block';},500);
  });
</script>
</body>
</html>`;
  res.send(html);
});

// Default route
app.get("/", (_req, res) => res.send("Server running. Visit /admin?key=YOUR_ADMIN_KEY to generate tokens."));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
