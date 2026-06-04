# 🌐 App Translator — Full DevOps Project

A full-stack translation application — built step by step, from a single Docker container all the way to a full CI/CD pipeline with Kubernetes and AWS.

The goal wasn't just to make it work. It was to build it the **right way** — secure, automated, and production-ready.

---

## 🧩 The Application

A simple translation app:
- User types text
- Selects a target language
- Gets a translation powered by LibreTranslate
- Every translation is saved to PostgreSQL and shown in history

Simple idea. Complex infrastructure.

---

## 🏗️ How It Was Built — The Evolution

### Stage 1 — Making It Work (Docker Compose)

The first goal was simple: get all services talking to each other.

```
User → Frontend (Nginx) → Backend (Node.js) → PostgreSQL
                                             → LibreTranslate
```

Everything ran in a single `docker-compose.yml` with a shared bridge network called `appnet`.
No automation. No CI. Just `docker compose up` and see if it works.

This stage taught the fundamentals — how services discover each other, how volumes work, and why health checks matter (the backend kept crashing because it tried to connect to PostgreSQL before it was ready).

---

### Stage 2 — Custom Dockerfiles

The next problem: the services were using generic images. Time to build our own.

```
frontend/Dockerfile  →  nginx:alpine + static files
backend/Dockerfile   →  node:18-alpine + server.js
```

This gave full control over what goes into each image — smaller, faster, more secure.

---

### Stage 3 — Full Docker Compose

With custom Dockerfiles in place, the `docker-compose.yml` was updated to build from local code instead of pulling images.

Added:
- `healthcheck` on PostgreSQL so the backend waits for it properly
- `init.sql` mounted as a volume to auto-create the database schema
- `docker-compose.test.yml` — a separate compose file for running integration tests in isolation

**Run locally:**
```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend | http://localhost:3001 |
| LibreTranslate | http://localhost:5000 |

---

### Stage 4 — Kubernetes

Docker Compose is great for local development — but it runs on one machine. What happens when that machine goes down?

The answer: **Kubernetes**.

The entire application was migrated from Docker Compose to Kubernetes manifests:

```
User
  ↓
Ingress (nginx) — routes traffic
  ↓
/        → frontend-service  → Deployment (Nginx)
/api/*   → backend-service   → Deployment (Node.js)
                                    ↓
                             translator-service → Deployment (LibreTranslate)
                                    ↓
                             postgres-service (Headless)
                                    ↓
                             StatefulSet (PostgreSQL) → PersistentVolume
```

Key decisions made here:
- PostgreSQL runs as a **StatefulSet** (not a Deployment) because it needs stable storage and a stable network identity
- Database credentials stored in a **Secret** (base64 encoded)
- DB schema injected via **ConfigMap** instead of hardcoding
- **Liveness & Readiness probes** on every service — Kubernetes needs to know when a pod is healthy

```bash
kubectl apply -f k8s/
```

---

### Stage 5 — Helm Chart

After writing all the Kubernetes YAML manually, a new problem appeared: every environment (dev, staging, prod) needed the same manifests with different values.

The solution: **Helm** — package the entire Kubernetes setup as a reusable chart.

```
helm/
├── Chart.yaml
├── values.yaml        ← single source of truth for all config
└── templates/         ← parametrized Kubernetes manifests
```

Now deploying to any environment is one command:
```bash
helm install app-translator ./helm
```

---

### Stage 6 — CI/CD with GitHub Actions

This is where everything came together.

The problem with the previous stages: every change required manual steps — build the image, push it, apply the manifests. Human error was inevitable.

The solution: **automate everything**.

#### Frontend Pipeline

```
Push to main (frontend/** changes)
    ↓
Verify frontend files exist
    ↓
Authenticate to AWS via OIDC (no passwords, no Access Keys)
    ↓
Sync files to S3 (static website hosting)
    ↓
Auto Git Tag (versioning)
```

Why S3 instead of Kubernetes for the frontend?
The frontend is just static files — HTML and JavaScript. There's no reason to run a container for that. S3 is cheaper, faster, and requires zero maintenance.

#### Backend Pipeline

```
Push to main (backend/** changes)
    ↓
Unit Tests
    ↓
Build Docker Image
    ↓
Integration Tests (full stack with Docker Compose)
    ↓
Push image to ECR (AWS private registry)
    ↓
SSH into EC2 → pull new image → restart container   ← CD
    ↓
Auto Git Tag (versioning)
```

Why ECR instead of DockerHub?
ECR is private by default and lives inside AWS — the same place as the EC2 server. No external registry, no public image, tighter security.

---

## 🔐 Security Decisions

Every security decision in this project was intentional:

| Decision | Why |
|----------|-----|
| AWS OIDC instead of Access Keys | Access Keys can leak. OIDC tokens are temporary and auto-expire |
| IAM Role with minimal permissions | Only `s3:PutObject`, `s3:DeleteObject`, `s3:GetObject`, `s3:ListBucket` — nothing more |
| ECR instead of public DockerHub | Docker images stay private inside AWS |
| SSH key stored as GitHub Secret | Never committed to code |
| EC2 IAM Role for ECR access | EC2 pulls images without any credentials in the code |

---

## ☁️ AWS Infrastructure

| Service | Usage |
|---------|-------|
| S3 | Frontend static website |
| EC2 (t3.micro) | Backend runtime (Docker) |
| ECR | Private Docker image registry |
| IAM OIDC Provider | Secure GitHub Actions auth |
| IAM Role | `github-actions-s3-role` — minimal permissions |

---

## 🔐 GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM Role for OIDC |
| `AWS_REGION` | `eu-north-1` |
| `S3_BUCKET_NAME` | Frontend bucket |
| `ECR_REGISTRY` | ECR registry URL |
| `EC2_HOST` | EC2 public DNS |
| `EC2_SSH_KEY` | EC2 private key |
| `DOCKERHUB_USERNAME` | DockerHub username |
| `DOCKERHUB_TOKEN` | DockerHub token |

---

## 📁 Project Structure

```
App-Translator/
├── .github/workflows/
│   ├── ci-frontend.yaml    # Frontend CI/CD → S3
│   └── ci-backend.yaml     # Backend CI/CD → ECR → EC2
├── frontend/               # Nginx + static files
├── backend/                # Node.js API + tests
├── db/                     # init.sql schema
├── k8s/                    # Kubernetes manifests
├── helm/                   # Helm chart
├── docker-compose.yml
└── docker-compose.test.yml
```

---

## 🏃 Run Locally

```bash
docker compose up -d
```

---

## 📌 Key DevOps Concepts Applied

- **Containerization** — every service runs in Docker
- **Orchestration** — Kubernetes manages scaling, health, and networking
- **Infrastructure as Code** — K8s manifests + Helm charts
- **CI/CD** — every push triggers automated tests and deployment
- **Least Privilege** — IAM roles with minimal permissions
- **Secrets Management** — OIDC + GitHub Secrets, zero hardcoded credentials
- **Health Checks** — Liveness & Readiness probes on every service
- **Auto Versioning** — Git tags after every successful deploy
