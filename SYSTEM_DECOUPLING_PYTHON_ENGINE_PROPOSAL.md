# Architecture Blueprint & Decoupling Strategy: Python Email Sync Engine

> **Document Created**: September 11, 2026  
> **Status**: Technical Reference & Future Implementation Blueprint  
> **Target Project**: Smart Money (`/home/ec2-user/smart-money`)  
> **Author**: Google DeepMind Antigravity Pair Programmer  

---

## 1. Executive Summary

This document outlines the architectural evaluation of **Smart Money** and details a strategic roadmap to decouple the background data ingestion layer into a high-performance **Python Microservice Engine**.

While the current Next.js 16 monolithic architecture provides rapid feature delivery and unified deployment, migrating the **Gmail sync engine and financial statement parser** to a specialized Python service will significantly improve application responsiveness, extraction accuracy, and long-term scalability.

---

## 2. Current Architecture Assessment

Currently, Smart Money operates as a **Next.js 16 Monolith** managed by PM2:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 MONOLITH                             │
│                                                                        │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │   UI Pages & React │  │   Next.js API      │  │ Node.js Gmail    │  │
│  │   Server Components│  │   Routes           │  │ Sync Parser      │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  └────────┬─────────┘  │
└────────────┼───────────────────────┼──────────────────────┼────────────┘
             │                       │                      │
             ▼                       ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL DATABASE                             │
│    public.users | auth.users | databank_entries | user_integrations    │
└────────────────────────────────────────────────────────────────────────┘
```

### Current Stack Summary
- **Frontend & APIs**: Next.js 16 App Router (Turbopack, React 19).
- **Database**: PostgreSQL (shared schema with native `public.users` and `auth.users`).
- **Data Proxy**: PostgREST daemon running on port 3001.
- **Process Manager**: PM2 managing `postgrest` (fork) and `smart-money` (2 cluster instances).
- **Email Parser**: Custom Node.js Regex parser ([`src/lib/gmail-parser.ts`](file:///home/ec2-user/smart-money/src/lib/gmail-parser.ts)) handling 30+ Nigerian banks and payment gateways (OPay, Kuda, GTBank, Zenith, Access, PalmPay, Moniepoint, etc.).

---

## 3. Bottlenecks & Limitations of Current Setup

1. **Event Loop Congestion**:  
   Bulk email processing requires fetching hundreds of MIME payload threads, parsing HTML strings, executing heavy regex passes, and triggering LLM fallbacks. In Node.js, running this inside serverless/API routes risks blocking the single-threaded event loop, leading to intermittent latency spikes for active web UI users.

2. **Parsing Limitations**:  
   Node.js string regexes are vulnerable to DOM structure shifts in bank alerts and cannot natively parse PDF bank statements attached to emails (e.g. monthly GTBank or Zenith e-statements).

3. **Background Job Resilience**:  
   Vercel/cron timeouts and transient Google OAuth rate limits are harder to manage inside short-lived Node.js API handlers.

---

## 4. Proposed Decoupled Target Architecture

The recommended target design keeps **Next.js for UI and Core Web APIs**, while offloading heavy email fetching, document parsing, and NLP transaction categorization to a **Python FastAPI + Celery Engine**.

```
                           ┌────────────────────────┐
                           │   Next.js 16 Web UI    │
                           │   & Web App Gateway    │
                           └───────────┬────────────┘
                                       │
                                       │ Async Sync Trigger
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    DEDICATED PYTHON ENGINE                             │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │   FastAPI Webhook &  │  │  Redis Task      │  │  Celery / ARQ    │  │
│  │   Control API        │──►  Queue Broker    ├──►  Worker Pool    │  │
│  └──────────────────────┘  └──────────────────┘  └────────┬─────────┘  │
└───────────────────────────────────────────────────────────┼────────────┘
                                                            │
                                  ┌─────────────────────────┴────────────────────────┐
                                  ▼                                                  ▼
                       ┌──────────────────────┐                           ┌─────────────────────┐
                       │  Google Gmail APIs   │                           │ PostgreSQL Database │
                       │  (Async OAuth)       │                           │ (databank_entries)  │
                       └──────────────────────┘                           └─────────────────────┘
```

---

## 5. Why Python for the Email Sync Engine?

| Dimension | Node.js (Current) | Python Microservice (Target) |
| :--- | :--- | :--- |
| **HTML & DOM Parsing** | Basic RegExp string matching | **`BeautifulSoup4` + `lxml`** robust tree extraction |
| **PDF Attachment Support** | Requires heavy native bindings | **`pdfplumber` / `pypdf`** native statement parsing |
| **Async Concurrency** | Thread pool shared with HTTP requests | **`asyncio` + `httpx`** dedicated non-blocking worker pools |
| **NLP & Categorization** | Basic regex string checks | **`pydantic` + `scikit-learn` / HuggingFace** ML classification |
| **Job Resilience** | Vulnerable to API route timeouts | **Celery + Redis** with exponential backoff & retries |

---

## 6. Phased Implementation Roadmap

When you are ready to implement this feature, follow these 5 execution phases:

### Phase 1: Create Python Service Directory
Create `/services/email_engine` with a virtual environment and core dependencies:
```bash
mkdir -p services/email_engine
cd services/email_engine
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn celery redis pydantic beautifulsoup4 lxml psycopg[binary] google-api-python-client httpx
```

### Phase 2: Port Parsing & Validation Schemas
Define Pydantic financial schemas in Python (`schemas.py`):
```python
from pydantic import BaseModel
from typing import Optional

class FinancialTransaction(BaseModel):
    user_id: str
    amount: float
    description: str
    entry_type: str  # 'income' or 'expense'
    category: str
    bank: Optional[str] = None
    account_balance: Optional[float] = None
    transaction_time: Optional[str] = None
```

### Phase 3: Implement Async Queue (Redis + Celery)
Configure background worker task in `tasks.py`:
```python
from celery import Celery

app = Celery('email_engine', broker='redis://localhost:6379/0')

@app.task(bind=True, max_retries=3)
def process_user_gmail_sync(self, user_id: str):
    # 1. Fetch encrypted tokens from PostgreSQL user_integrations
    # 2. Refresh Google OAuth token using Google API Client
    # 3. Fetch recent emails & parse HTML tables with BeautifulSoup4
    # 4. Atomic batch insert into databank_entries
    pass
```

### Phase 4: Delegate Cron Trigger from Next.js
Modify [`src/app/api/cron/gmail-sync/route.ts`](file:///home/ec2-user/smart-money/src/app/api/cron/gmail-sync/route.ts) to send a lightweight trigger request to Python FastAPI endpoint `POST http://127.0.0.1:8000/api/sync/trigger`.

### Phase 5: PM2 Process Integration
Update [`ecosystem.config.js`](file:///home/ec2-user/smart-money/ecosystem.config.js) to manage the Python service alongside Next.js and PostgREST:
```javascript
module.exports = {
  apps: [
    {
      name: "postgrest",
      script: "./scratch/postgrest",
      args: "./scratch/postgrest.conf",
      cwd: "/home/ec2-user/smart-money",
      instances: 1,
      exec_mode: "fork",
      env: { PORT: 3001 }
    },
    {
      name: "smart-money-web",
      script: "./node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      cwd: "/home/ec2-user/smart-money",
      instances: 2,
      exec_mode: "cluster"
    },
    {
      name: "email-engine-api",
      script: "uvicorn",
      args: "main:app --host 127.0.0.1 --port 8000",
      cwd: "/home/ec2-user/smart-money/services/email_engine",
      interpreter: "python3"
    },
    {
      name: "email-engine-worker",
      script: "celery",
      args: "-A tasks worker --loglevel=info",
      cwd: "/home/ec2-user/smart-money/services/email_engine",
      interpreter: "python3"
    }
  ]
};
```

---

## 7. Conclusion

This architecture provides a scalable roadmap. It retains the quick iteration speed of **Next.js** for frontend development while equipping **Smart Money** with an enterprise-grade **Python processing backend** for deep financial email and bank statement analytics.
