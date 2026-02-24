#!/usr/bin/env node
/**
 * Mission Control — GitHub Webhook Deploy Server
 * Runs a small HTTP server that listens for GitHub push events
 * and triggers a deploy automatically.
 *
 * Usage: node scripts/deploy-webhook.js
 * Env:
 *   WEBHOOK_SECRET  — GitHub webhook secret (set in repo settings)
 *   WEBHOOK_PORT    — Port to listen on (default: 9001)
 *   DEPLOY_BRANCH   — Branch to auto-deploy (default: main)
 *
 * Setup in GitHub:
 *   Repo → Settings → Webhooks → Add webhook
 *   Payload URL: http://<your-host>:9001/webhook
 *   Content type: application/json
 *   Secret: <WEBHOOK_SECRET>
 *   Events: Just the push event
 */

const http = require("http");
const crypto = require("crypto");
const { execSync } = require("child_process");
const path = require("path");

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const WEBHOOK_PORT = parseInt(process.env.WEBHOOK_PORT || "9001");
const DEPLOY_BRANCH = process.env.DEPLOY_BRANCH || "main";
const DEPLOY_SCRIPT = path.join(__dirname, "deploy.sh");

function verifySignature(payload, signature) {
  if (!WEBHOOK_SECRET) return true; // skip if no secret configured
  const expected = "sha256=" + crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const sig = req.headers["x-hub-signature-256"] || "";
    if (WEBHOOK_SECRET && !verifySignature(body, sig)) {
      console.error("[webhook] ❌ Invalid signature");
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    const ref = payload.ref || "";
    const branch = ref.replace("refs/heads/", "");
    const pusher = payload.pusher?.name || "unknown";
    const commitMsg = payload.head_commit?.message?.split("\n")[0] || "";

    console.log(`[webhook] Push from ${pusher} on ${branch}: "${commitMsg}"`);

    if (branch !== DEPLOY_BRANCH) {
      console.log(`[webhook] Skipping — not ${DEPLOY_BRANCH}`);
      res.writeHead(200);
      res.end("Skipped");
      return;
    }

    res.writeHead(202);
    res.end("Deploying...");

    // Run deploy async
    setTimeout(() => {
      console.log(`[webhook] 🚀 Triggering deploy for branch ${branch}...`);
      try {
        execSync(`bash ${DEPLOY_SCRIPT}`, { stdio: "inherit", cwd: path.join(__dirname, "..") });
        console.log("[webhook] ✅ Deploy complete");
      } catch (err) {
        console.error("[webhook] ❌ Deploy failed:", err.message);
      }
    }, 100);
  });
});

server.listen(WEBHOOK_PORT, () => {
  console.log(`[webhook] 🎣 Listening on :${WEBHOOK_PORT} — watching branch: ${DEPLOY_BRANCH}`);
  if (!WEBHOOK_SECRET) {
    console.warn("[webhook] ⚠️  No WEBHOOK_SECRET set — signature verification disabled");
  }
});
