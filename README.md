<h1 align="center">Phoenix Bank</h1>

<p align="center">
  A full-stack digital banking platform built with React, FastAPI, and MongoDB.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Motor-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" />
</p>

---

## Overview

Phoenix Bank is a production-grade banking application that simulates the core features of a modern digital bank. It includes separate customer and manager portals, real-time transaction processing, scheduled payments, check deposit with OCR, and downloadable financial reports — all containerised with Docker and served behind nginx.

---

## Features

**Customer Portal**
- Dashboard with live balance, month-over-month spending analytics, and account cards
- Internal and external fund transfers with idempotency guarantees
- Check deposit with OCR extraction (GPT-4 Vision + Tesseract fallback)
- Scheduled and recurring payments (daily / weekly / biweekly / monthly / yearly)
- Downloadable transaction history as PDF or CSV
- Credit card application and review workflow
- ATM locator

**Manager Portal**
- View and manage all customers and accounts
- Freeze / unfreeze accounts and adjust balances
- Review and approve or deny check deposits
- Full transaction history with filtering

**Auth & Security**
- Email / password registration with verification flow
- Google OAuth 2.0 sign-in
- JWT authentication stored in `sessionStorage` (cleared on tab close)
- Distributed lock-based scheduled job processing to prevent double-firing
- Per-endpoint rate limiting

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TanStack Query, Bootstrap |
| Backend | FastAPI, Python 3.11, APScheduler |
| Database | MongoDB (Motor async driver) |
| Auth | JWT, Google OAuth 2.0, bcrypt |
| Reporting | ReportLab (PDF), csv |
| OCR | Tesseract, GPT-4 Vision (optional) |
| Infrastructure | Docker, Docker Compose, nginx |

---

## Quick Start

**Requirements:** Docker Desktop 20.10+

```bash
# 1. Clone and enter the infra directory
git clone https://github.com/matijam2004/PhoenixBank.git
cd PhoenixBank/infra

# 2. Configure environment
cp env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, and optionally Google OAuth keys

# 3. Start all services
docker compose up -d

# 4. Open the app
# Frontend:   http://localhost
# API docs:   http://localhost:8000/docs
# Health:     http://localhost:8000/api/health
```

All services (MongoDB, FastAPI backend, React frontend via nginx) start in the correct dependency order. The backend runs database index creation and kicks off the scheduler on startup.

---

## Project Structure

```
PhoenixBank/
├── backend/
│   ├── auth/               # JWT + Google OAuth
│   ├── account/            # Account CRUD
│   ├── transaction/        # Transaction processing + scheduler
│   ├── scheduled_payment/  # Recurring payments
│   ├── check/              # OCR + LLM check extraction
│   ├── reporting/          # PDF / CSV export
│   ├── card_application/   # Card application workflow
│   ├── manager/            # Manager-scoped endpoints
│   ├── shared/             # Locks, idempotency, email, payments
│   └── database/           # Motor client + index bootstrap
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route-level components
│   │   ├── components/     # Shared UI components
│   │   ├── hooks/          # TanStack Query hooks
│   │   ├── services/api/   # Typed API clients
│   │   └── utils/          # Date, number, transaction helpers
│   └── nginx.conf
└── infra/
    ├── docker-compose.yml
    └── env.example
```

---

## Environment Variables

Copy `infra/env.example` to `infra/.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs — use a long random string in production |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `SMTP_HOST / SMTP_USER / SMTP_PASSWORD` | No | SMTP credentials for email verification |
| `OPENAI_API_KEY` | No | Enables GPT-4 Vision for check processing |

The app runs without Google OAuth and SMTP — those features are simply disabled if the keys are absent.

---

## API

Interactive API documentation is available at **http://localhost:8000/docs** when the backend is running. All endpoints require a Bearer token except `/auth/login`, `/auth/register`, and `/health`.
