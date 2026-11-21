<div align="center">

# 🌱 WastePulse
### AI-Driven Circular Economy & Commercial Surplus Diversion Engine

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Django](https://img.shields.io/badge/Django_REST-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-0F172A?style=for-the-badge&logo=tailwind-css&logoColor=38BDF8)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini_Vision-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)

*Turning commercial waste streams into verified, predictable, and atomically claimable recovery batches.*

**Developed by Sakith**

</div>

---

## 📸 Platform Screenshots

### 1. Command Center Dashboard & 7-Day Surplus Forecast
![WastePulse Command Center Dashboard](<img width="1917" height="910" alt="Screenshot 2026-11-21 213641" src="https://github.com/user-attachments/assets/6a5ee1a1-e49d-4de6-8b6b-b830eefbd5b9" />
)

### 2. AI Vision Contamination & Weight Scanner
![WastePulse AI Vision Contamination Scanner](<img width="650" height="467" alt="Screenshot 2026-11-21 213821" src="https://github.com/user-attachments/assets/a6b45785-4615-4fb0-ac0e-783aea426c3c" />
)

### 3. Live Atomic Surplus Marketplace
![WastePulse Live Surplus Marketplace](<img width="1212" height="287" alt="Screenshot 2026-11-21 214342" src="https://github.com/user-attachments/assets/42479db8-32a6-4c34-b973-fbb08aac770a" />
)

---

## 1. The Problem & Solution

### The Problem
Commercial supermarkets, restaurants, warehouses, and manufacturers discard tons of recoverable organic surplus, packaging, and recyclables every week because:
1. **Unverified Quality:** Recyclers waste fuel picking up batches that turn out to be heavily contaminated.
2. **Reactive Logistics:** Collectors only learn about surplus *after* it piles up, leaving no time to pre-allocate trucks before organic spoilage.
3. **Marketplace Race Conditions:** Multiple collectors attempting to claim high-value batches simultaneously cause double-bookings and failed pickups.

### The WastePulse Solution
WastePulse unifies **Computer Vision**, **Predictive Machine Learning**, and **Transactional Database Concurrency** into a single real-time command center:
* **Instant AI Quality Auditing:** Donors snap a photo of a surplus batch; Google Gemini Vision classifies the material, estimates weight, and calculates a contamination score (`0%–100%`) before listing.
* **Proactive 7-Day Supply Forecasting:** An L2-regularized Ridge Regression model predicts upcoming commercial surplus peaks by sector so recyclers can schedule fleet capacity in advance.
* **Race-Condition-Free Claiming:** PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) guarantees atomic batch reservations across concurrent collectors.

---

## 2. System Architecture

```text
┌─────────────────────────────┐         REST / JSON         ┌───────────────────────────────────┐
│   React + Vite + Tailwind   │ ◄─────────────────────────► │     Django REST Framework API     │
│  (Dashboard, Vision UI,     │   multipart/form-data       │  • /api/scan/ (Gemini Vision)     │
│   Forecast Chart, Market)   │   (Downscaled Image Upload) │  • /api/forecast/ (ML Regressor)  │
└─────────────────────────────┘                             │  • /api/batches/ (CRUD + Lock)    │
                                                            │  • /api/metrics/ (CO2 Analytics)  │
                                                            └──────────┬──────────────┬─────────┘
                                                                       │              │
                                                      Structured JSON  │              │ select_for_update()
                                                      Schema + Minimal │              │ Atomic Transactions
                                                      Thinking Mode    ▼              ▼
                                                            ┌──────────────────┐ ┌──────────────────┐
                                                            │  Google Gemini   │ │   PostgreSQL     │
                                                            │  Vision API      │ │   (Neon Cloud)   │
                                                            └──────────────────┘ └──────────────────┘
```

---

## 3. Core Technical Features

### 🔍 AI Vision Contamination Scanner (`/api/scan/`)
* **Structured Output Enforcement:** Uses Pydantic schemas (`WasteScanSchema`) to guarantee deterministic JSON responses (`category`, `contamination_score`, `estimated_weight_kg`, `is_recyclable`, `ai_notes`).
* **Low-Latency Pipeline:** Automatically normalizes color spaces and downscales uploaded images to `768px` via Pillow (`thumbnail`) while running Gemini Flash-Lite with minimal thinking overhead and multi-model fallback resilience.

### 📈 7-Day Surplus Forecast Engine (`/api/forecast/`)
* **Zero-Bloat Pure-Python ML:** Implements `RidgeSurplusRegressor` (L2-regularized gradient descent) using cyclic temporal encodings ($\sin/\cos$ day-of-week harmonics) without heavy C-extension dependencies (`numpy`/`scikit-learn`), keeping serverless deployments fast and lightweight.
* **Sector-Aware Calibration:** Dynamically models commercial output profiles across **Supermarkets**, **Restaurants**, **Warehouses**, and **Manufacturers**, scaling automatically as live platform volume grows.

### 🔒 Atomic Surplus Marketplace (`/api/batches/<id>/claim/`)
* **Concurrency Protection:** Wraps claim operations inside `django.db.transaction.atomic()` with `WasteBatch.objects.select_for_update()`. If two collectors click **Claim Batch** at the exact same millisecond, PostgreSQL serializes the lock—succeeding for the first collector (`200 OK`) and cleanly rejecting the second (`409 Conflict`).

### 🌍 Automated Carbon Impact Ledger (`/api/metrics/`)
* Calculates real-time net $\text{CO}_2\text{e}$ emissions avoided upon batch creation using material-specific diversion factors (`ORGANIC`, `PLASTIC`, `CARDBOARD`, `METAL`, `GLASS`, `EWASTE`).

---

## 4. Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Lucide React |
| **Backend** | Python 3.11+, Django 5, Django REST Framework, `django-cors-headers` |
| **AI & ML** | Google GenAI SDK (`google-genai`), Pydantic v2, Pillow, Custom L2 Ridge Regressor |
| **Database** | PostgreSQL (Neon Serverless / Local PostgreSQL), `psycopg2-binary`, `dj-database-url` |
| **Hosting** | Vercel (Serverless Python WSGI + Static Edge Frontend) |

---

## 5. Repository Structure

```text
wastepulse/
├── backend/
│   ├── api/
│   │   ├── migrations/         # PostgreSQL schema migrations
│   │   ├── admin.py            # Django admin registration
│   │   ├── ml_forecast.py      # Pure-Python Ridge Regression surplus forecaster
│   │   ├── models.py           # WasteBatch model & CO2 emission factor calculations
│   │   ├── serializers.py      # DRF validation & JSON serialization
│   │   ├── urls.py             # API endpoint routing
│   │   └── views.py            # Vision scanner, atomic claiming, metrics & forecast views
│   ├── wastepulse_backend/
│   │   ├── settings.py         # Environment-driven Django, CORS & Neon DB config
│   │   ├── urls.py             # Root URL configuration
│   │   └── wsgi.py             # WSGI entry point for Vercel / Gunicorn
│   ├── manage.py
│   └── requirements.txt
├── docs/
│   └── screenshots/
│       ├── dashboard-overview.png
│       └── marketplace-batches.png
└── frontend/
    ├── public/
    │   └── favicon.svg         # Custom WastePulse vector badge
    ├── src/
    │   ├── api.js              # Centralized REST API client with error handling
    │   ├── App.jsx             # Responsive command-center UI
    │   ├── index.css           # Tailwind CSS v4 setup
    │   └── main.jsx            # React DOM root
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## 6. REST API Reference

| Method | Endpoint | Payload / Query | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/batches/` | — | Retrieve all waste batches ordered by newest first |
| `POST` | `/api/batches/` | JSON (`title`, `category`, `weight_kg`, `contamination_score`, `donor_name`, `location_name`, `notes`) | Publish a verified batch to the live marketplace |
| `POST` | `/api/batches/<id>/claim/` | JSON (`claimed_by`) | Atomically lock and claim an `AVAILABLE` batch (`409` on race conflict) |
| `GET` | `/api/metrics/` | — | Get total logged weight (kg), $\text{CO}_2\text{e}$ avoided (kg), and diversion ratio |
| `POST` | `/api/scan/` | `multipart/form-data` (`image`) | Run Gemini Vision classification, weight estimation & purity scoring |
| `GET` | `/api/forecast/` | `?business_type=SUPERMARKET&days=7` | Generate 7-day ML surplus predictions and peak alert metadata |

---

## 7. Local Development Setup

### Prerequisites
* **Python 3.11+** and **Node.js 18+**
* A **PostgreSQL** database URL (e.g., [Neon](https://neon.tech))
* A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)

### Step 1: Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)<your-username>/wastepulse.git
cd wastepulse
```

### Step 2: Configure & Start the Django Backend
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
# source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
SECRET_KEY=replace-with-a-strong-random-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@ep-example.aws.neon.tech/neondb?sslmode=require
GEMINI_API_KEY=your-google-gemini-api-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Apply database migrations and start the API server:
```bash
python manage.py migrate
python manage.py runserver
```
The API will be available at `http://127.0.0.1:8000/api/`.

### Step 3: Configure & Start the React Frontend
Open a second terminal:
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_BASE_URL=[http://127.0.0.1:8000/api](http://127.0.0.1:8000/api)
```

Start the Vite development server:
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 8. Demo Walkthrough

1. **Scan Waste Stream:** Upload an image of commercial packaging, produce, or recyclables in the **AI Vision Contamination Scanner** and click **Run Contamination & Material Scan**.
2. **Verify & Publish:** Review the AI-generated category, estimated weight, contamination score, and handling notes, then click **Publish Verified Batch to Marketplace**.
3. **Inspect Surplus Forecast:** Switch business profiles (`Supermarket`, `Restaurant`, `Warehouse`, `Manufacturer`) in the **7-Day Surplus Forecast** panel to observe peak surplus alerts.
4. **Test Atomic Claiming:** Enter a collector organization name in the top navbar (`Active Collector`) and click **Claim Batch for Pickup** to lock the batch and update the top KPI diversion metrics in real time.

---
