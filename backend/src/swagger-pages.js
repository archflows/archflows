export function docsLoginPage({ error = false } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in · ArcFlow API</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --void: #08090c;
      --deep: #0c0d12;
      --panel: #12131a;
      --ink: #ffffff;
      --dim: #9ca3af;
      --line: rgba(148, 163, 184, 0.12);
      --brand: #0050e0;
      --brand-hover: #1a64e8;
      --ion: #4d8aff;
      --danger: #f87171;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      background: var(--void);
      min-height: 100%;
    }
    .shell {
      min-height: 100%;
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(22rem, 28rem);
    }
    .aside {
      position: relative;
      overflow: hidden;
      padding: 2.25rem 2.5rem 2rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid var(--line);
      background:
        radial-gradient(80% 70% at 110% 10%, rgba(0, 80, 224, 0.38), transparent 58%),
        radial-gradient(70% 50% at 0% 100%, rgba(77, 138, 255, 0.12), transparent 55%),
        linear-gradient(180deg, #0b1020 0%, var(--deep) 55%, #07080c 100%);
    }
    .orb {
      position: absolute;
      width: 22rem;
      height: 22rem;
      right: -4rem;
      top: 18%;
      border-radius: 50%;
      background: conic-gradient(from 210deg, #3b7aff, #0050e0 40%, transparent 72%);
      filter: blur(8px);
      opacity: 0.45;
      animation: spin 28s linear infinite;
    }
    .ring {
      position: absolute;
      right: 3.5rem;
      top: 28%;
      width: 14rem;
      height: 14rem;
      border-radius: 50%;
      border: 1px solid rgba(77, 138, 255, 0.28);
      box-shadow: 0 0 80px rgba(0, 80, 224, 0.25);
    }
    .ring::after {
      content: "";
      position: absolute;
      inset: 1.4rem;
      border-radius: 50%;
      border: 1px dashed rgba(165, 184, 255, 0.28);
    }
    @keyframes spin { to { transform: rotate(1turn); } }
    .brand {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      text-decoration: none;
      color: inherit;
      width: fit-content;
    }
    .mark {
      width: 2rem;
      height: 2rem;
      border-radius: 0.55rem;
      background: linear-gradient(160deg, #4d8aff, #0050e0 62%, #0030b0);
      display: grid;
      place-items: center;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 10px 30px rgba(0,80,224,0.35);
    }
    .word {
      font-weight: 700;
      letter-spacing: -0.04em;
      font-size: 1.15rem;
    }
    .tag {
      position: relative;
      margin: 0 0 0.85rem;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      color: var(--ion);
    }
    h1 {
      position: relative;
      margin: 0 0 0.75rem;
      font-size: clamp(1.7rem, 3vw, 2.35rem);
      letter-spacing: -0.04em;
      line-height: 1.15;
      max-width: 16ch;
    }
    .lede {
      position: relative;
      margin: 0;
      max-width: 28rem;
      color: var(--dim);
      font-size: 0.95rem;
      line-height: 1.7;
    }
    .meta {
      position: relative;
      margin: 1.6rem 0 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .chip {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.68rem;
      color: #c7d4ff;
      border: 1px solid rgba(77, 138, 255, 0.22);
      background: rgba(0, 80, 224, 0.12);
      border-radius: 999px;
      padding: 0.28rem 0.6rem;
    }
    .foot {
      position: relative;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.7rem;
      color: var(--dim);
      margin: 0;
    }
    .main {
      display: grid;
      place-items: center;
      padding: 2rem 1.5rem;
      background: var(--deep);
    }
    .card {
      width: min(100%, 22.5rem);
    }
    .card h2 {
      margin: 0 0 0.35rem;
      font-size: 1.45rem;
      letter-spacing: -0.03em;
    }
    .card p.sub {
      margin: 0 0 1.4rem;
      color: var(--dim);
      font-size: 0.9rem;
      line-height: 1.55;
    }
    label {
      display: block;
      margin: 0 0 0.4rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: #d1d5db;
    }
    .field { margin-bottom: 0.95rem; }
    .control {
      position: relative;
    }
    input {
      width: 100%;
      height: 2.75rem;
      border-radius: 0.75rem;
      border: 1px solid var(--line);
      background: rgba(148, 163, 184, 0.05);
      color: var(--ink);
      padding: 0 2.6rem 0 0.9rem;
      font: 500 0.92rem/1 Inter, sans-serif;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    }
    input:focus {
      border-color: rgba(0, 80, 224, 0.7);
      box-shadow: 0 0 0 4px rgba(0, 80, 224, 0.18);
      background: rgba(0, 80, 224, 0.06);
    }
    .toggle {
      position: absolute;
      right: 0.35rem;
      top: 50%;
      transform: translateY(-50%);
      border: 0;
      background: transparent;
      color: var(--dim);
      width: 2.1rem;
      height: 2.1rem;
      border-radius: 0.5rem;
      cursor: pointer;
    }
    .toggle:hover { color: var(--ink); background: rgba(255,255,255,0.04); }
    .alert {
      display: ${error ? "flex" : "none"};
      align-items: flex-start;
      gap: 0.6rem;
      margin: 0 0 1.1rem;
      padding: 0.75rem 0.85rem;
      border-radius: 0.75rem;
      border: 1px solid rgba(248, 113, 113, 0.28);
      background: rgba(248, 113, 113, 0.08);
      color: #fecaca;
      font-size: 0.82rem;
      line-height: 1.45;
    }
    .alert b { display: block; color: #fff; margin-bottom: 0.1rem; }
    button[type="submit"] {
      width: 100%;
      height: 2.85rem;
      margin-top: 0.35rem;
      border: 0;
      border-radius: 0.8rem;
      background: linear-gradient(180deg, #1a64e8, var(--brand));
      color: #fff;
      font: 600 0.95rem/1 Inter, sans-serif;
      letter-spacing: -0.01em;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(0, 80, 224, 0.32);
    }
    button[type="submit"]:hover { background: var(--brand-hover); }
    .hint {
      margin: 1.15rem 0 0;
      color: var(--dim);
      font-size: 0.75rem;
      line-height: 1.55;
      text-align: center;
    }
    .mobile-brand { display: none; }
    @media (max-width: 860px) {
      .shell { grid-template-columns: 1fr; }
      .aside { display: none; }
      .mobile-brand { display: flex; margin-bottom: 1.4rem; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <aside class="aside">
      <a class="brand" href="/docs">
        <span class="mark" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1.4 14.2 5v6L8 14.6 1.8 11V5L8 1.4Z" stroke="#fff" stroke-width="1.3"/>
            <path d="M8 4.2v7.6M4.4 6.2 8 8.2l3.6-2" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="word">ArcFlow</span>
      </a>
      <div>
        <div class="orb"></div>
        <div class="ring"></div>
        <p class="tag">// API CONSOLE</p>
        <h1>Open the index that tracks every orbit</h1>
        <p class="lede">Locks, streams, airdrops, escrow, and staking on Arc. Gas is USDC. Sign in to browse and try the live endpoints.</p>
        <div class="meta">
          <span class="chip">Arc Mainnet</span>
          <span class="chip">OpenAPI 3</span>
          <span class="chip">USDC gas</span>
        </div>
      </div>
      <p class="foot">// docs · swagger · session cookie</p>
    </aside>
    <main class="main">
      <form class="card" method="post" action="/docs/login" autocomplete="on">
        <a class="brand mobile-brand" href="/docs">
          <span class="mark" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.4 14.2 5v6L8 14.6 1.8 11V5L8 1.4Z" stroke="#fff" stroke-width="1.3"/>
              <path d="M8 4.2v7.6M4.4 6.2 8 8.2l3.6-2" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>
            </svg>
          </span>
          <span class="word">ArcFlow</span>
        </a>
        <p class="tag">// AUTHENTICATION</p>
        <h2>Welcome back</h2>
        <p class="sub">Use a docs login stored in the API database — admin or partner.</p>
        <div class="alert" role="alert">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex:0 0 auto;margin-top:2px">
            <circle cx="8" cy="8" r="6.2" stroke="currentColor" stroke-width="1.4"/>
            <path d="M8 4.8v4.1M8 11.2h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <div><b>Sign-in failed</b>Username or password is wrong. Try again.</div>
        </div>
        <div class="field">
          <label for="username">Username</label>
          <div class="control">
            <input id="username" name="username" type="text" autocomplete="username" required autofocus />
          </div>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <div class="control">
            <input id="password" name="password" type="password" autocomplete="current-password" required />
            <button class="toggle" type="button" id="peek" aria-label="Show password">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.6 8S3.8 3.8 8 3.8 14.4 8 14.4 8 12.2 12.2 8 12.2 1.6 8 1.6 8Z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/></svg>
            </button>
          </div>
        </div>
        <button type="submit">Continue to docs</button>
        <p class="hint">After login, authorize requests with an API key in Swagger. This page is for the console only.</p>
      </form>
    </main>
  </div>
  <script>
    const input = document.getElementById("password");
    document.getElementById("peek").addEventListener("click", () => {
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
    });
  </script>
</body>
</html>`;
}

export function docsSwaggerPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ArcFlow API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.27.1/swagger-ui.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --brand: #0050e0; --void: #08090c; --deep: #0c0d12; --ink: #f4f6fb; --dim: #9ca3af; }
    html, body { margin: 0; background: var(--void); color: var(--ink); }
    body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    .af-bar {
      position: sticky; top: 0; z-index: 20;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
      padding: 0.85rem 1.25rem;
      border-bottom: 1px solid rgba(148,163,184,0.12);
      background: rgba(8,9,12,0.88);
      backdrop-filter: blur(14px);
    }
    .af-brand { display: flex; align-items: center; gap: 0.65rem; color: inherit; text-decoration: none; }
    .af-mark {
      width: 1.7rem; height: 1.7rem; border-radius: 0.45rem;
      background: linear-gradient(160deg, #4d8aff, #0050e0 62%);
      display: grid; place-items: center;
    }
    .af-word { font-weight: 700; letter-spacing: -0.04em; }
    .af-word span { color: #9ca3af; font-weight: 500; margin-left: 0.4rem; font-size: 0.82rem; }
    .af-out {
      color: #d1d5db; text-decoration: none; font-size: 0.82rem; font-weight: 500;
      border: 1px solid rgba(148,163,184,0.16); border-radius: 999px; padding: 0.4rem 0.75rem;
    }
    .af-out:hover { border-color: rgba(77,138,255,0.45); color: #fff; }
    .swagger-ui { background: transparent; }
    .swagger-ui .topbar, .swagger-ui .information-container .info .title small { display: none; }
    .swagger-ui .scheme-container,
    .swagger-ui .wrapper,
    .swagger-ui .opblock,
    .swagger-ui .opblock-tag,
    .swagger-ui section.models {
      background: transparent !important;
      box-shadow: none !important;
    }
    .swagger-ui .info { margin: 24px 0; }
    .swagger-ui .info .title { color: #fff; font-family: Inter, sans-serif; }
    .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .markdown p { color: #c5c9d3; }
    .swagger-ui .opblock-tag { color: #fff; border-color: rgba(148,163,184,0.12); }
    .swagger-ui .opblock { border-radius: 12px; border-color: rgba(148,163,184,0.12); background: #12131a !important; }
    .swagger-ui .opblock .opblock-summary-path, .swagger-ui .opblock .opblock-summary-description { color: #e5e7eb; }
    .swagger-ui .btn.authorize { background: var(--brand); border-color: var(--brand); color: #fff; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
  </style>
</head>
<body>
  <header class="af-bar">
    <a class="af-brand" href="/docs">
      <span class="af-mark" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.4 14.2 5v6L8 14.6 1.8 11V5L8 1.4Z" stroke="#fff" stroke-width="1.3"/>
        </svg>
      </span>
      <span class="af-word">ArcFlow <span>API docs</span></span>
    </a>
    <a class="af-out" href="/docs/logout">Sign out</a>
  </header>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.27.1/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/docs.json",
      dom_id: "#swagger-ui",
      persistAuthorization: true,
      displayRequestDuration: true,
      deepLinking: true,
    });
  </script>
</body>
</html>`;
}
