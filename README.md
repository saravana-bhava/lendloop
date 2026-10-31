# 🛠️ LendLoop — Neighborhood Tool-Lending Board

> *"Borrow what you need. Lend what you don’t."*

LendLoop is a neighborhood tool-lending platform with end-to-end automated workflow orchestration. Neighbors can list household and workshop tools, request short-term borrows, and receive automated notifications and overdue return reminders powered by n8n.

Built as a take-home architecture solution for **Fluence International, Inc.**

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 15 (App Router)** | Server Components, responsive Tailwind UI, client interactivity |
| **Authentication** | **Clerk** | Secure JWT-based identity, session tokens, user profile sync |
| **Data & Logic** | **Convex** | Real-time reactive data platform with mutation-level RBAC |
| **Automation** | **n8n (Docker / Cloud)** | Webhook-driven status alerts, daily scheduled overdue sweeps |
| **Security** | **HMAC-SHA256** | Cryptographic payload signing & constant-time signature validation |

---

## 🔐 Security & Data-Minimization Decisions

1. **Strict Data Minimization on Public Surfaces:**
   - The unauthenticated public catalog (`convex/tools.ts:listPublicTools`) projects **only** `name`, `category`, and `isAvailable`.
   - Sensitive metadata (owner Clerk ID, email, physical neighborhood address, creation timestamps) is strictly withheld until authentication is verified.

2. **Database-Level Role-Based Access Control (RBAC):**
   - RBAC is enforced inside **Convex server mutations**, not relying on client UI checks.
   - `admin` role: Can moderate/delete any listing, inspect all active and historical neighborhood loans, and promote lenders to *Trusted Lender* status.
   - `user` role: Can create, edit, or delete **only their own** tool listings, and can approve/decline requests **only for tools they own**.

3. **Bi-Directional Cryptographic Webhook Security:**
   - Convex ➔ n8n webhooks include an `X-LendLoop-Signature` header computed as `HMAC-SHA256(rawPayload, N8N_WEBHOOK_SECRET)`.
   - n8n ➔ Convex write-backs are verified via `crypto.timingSafeEqual` in `convex/http.ts` to defend against timing attacks.
   - Zero credentials or API keys are stored in exported workflow JSONs or client bundles.

4. **Idempotency & Retry Resilience:**
   - Overdue reminders write back to Convex using deterministic keys: `reminder_${YYYY-MM-DD}_${requestId}`.
   - If n8n retries an execution upon network timeout, Convex checks `automationLogs` and treats duplicates as a no-op, preventing duplicate notifications.

---

## ⚡ n8n Workflows Included

The exported workflow definitions are stored in [`n8n/workflows/`](./n8n/workflows/):

1. **`request-notification.json` (Event-Driven):**
   - Receives HMAC-signed Convex webhooks on borrow request creation or status change.
   - Validates the signature, strips unneeded parameters, and dispatches targeted alerts to tool owners and borrowers.
2. **`overdue-reminders.json` (Scheduled Sweep):**
   - Runs daily at 09:00 UTC via Cron trigger.
   - Queries `GET /api/loans/overdue` using an internal Bearer secret.
   - Loops through delinquent loans and issues an idempotent write-back to `POST /api/loans/reminder-sent` with retry backoff.

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/saravana-bhava/lendloop.git
cd lendloop
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Clerk publishable/secret keys and Convex deployment URL.

### 3. Start Local n8n (Docker Compose)
Self-host n8n with one command:
```bash
docker compose up -d
```
Access the n8n UI at `http://localhost:5678`. Workflows can be imported directly from `./n8n/workflows/`.

### 4. Run Convex & Next.js
```bash
# Terminal 1: Convex reactive backend
npx convex dev

# Terminal 2: Next.js dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏭 Production Engineering Notes (What Changes for Production)

To scale LendLoop for enterprise production and compliance-heavy environments (e.g. healthcare B2B):

1. **Infrastructure & Edge Distribution:**
   - Host Next.js on AWS ECS/Fargate behind CloudFront or Cloudflare Workers/Pages edge to maintain low latency.
   - Deploy n8n in high-availability mode with a shared PostgreSQL database and Redis queue workers.

2. **Secret Management & Audit Logging:**
   - Migrate webhook secrets from static environment variables to **AWS Secrets Manager** with automated 30-day rotation.
   - Stream all `automationLogs` and Convex audit records into **AWS CloudTrail** and **Datadog** for tamper-evident compliance trails.

3. **Observability & Error Budgets:**
   - Attach **Sentry** SDKs across both Next.js App Router and n8n error workflows to catch uncaught promise rejections and webhook delivery timeouts.

4. **AI & Guardrails Integration:**
   - Introduce **AWS Bedrock** with custom safety guardrails to automatically screen tool photos and descriptions for dangerous contraband or hazardous items prior to publication.

---

## 📄 License
MIT © Saravana Bhava (SazM)
