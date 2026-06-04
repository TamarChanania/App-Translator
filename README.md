# 🌐 App Translator — Full DevOps Project

A full-stack translation application built with a complete DevOps pipeline including CI/CD, containerization, Kubernetes orchestration, and AWS cloud deployment.

---

## 🏗️ Architecture Overview

```
User
 │
 ▼
S3 (Frontend - Static Website)
 │
 ▼
EC2 (Backend - Node.js API)
 │
 ├──► PostgreSQL (Database)
 │
 └──► LibreTranslate (Translation Engine)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, JavaScript, Nginx |
| Backend | Node.js, Express |
| Database | PostgreSQL 15 |
| Translation Engine | LibreTranslate |
| Containerization | Docker, Docker Compose |
| Orchestration | Kubernetes + Helm |
| CI/CD | GitHub Actions |
| Cloud | AWS (S3, EC2, ECR) |
| Auth | AWS OIDC (no static credentials) |

---

## 📁 Project Structure

```
App-Translator/
├── .github/
│   └── workflows/
│       ├── ci-frontend.yaml     # CI/CD for frontend → S3
│       └── ci-backend.yaml      # CI/CD for backend → ECR → EC2
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── nginx.conf
│   └── Dockerfile
├── backend/
│   ├── server.js
│   ├── server.test.js
│   ├── server.integration.test.js
│   ├── package.json
│   └── Dockerfile
├── db/
│   └── init.sql
├── k8s/
│   ├── 02-backend-deployment.yaml
│   ├── 03-database.yaml
│   ├── 04-volumes.yaml
│   ├── 05-frontend.yaml
│   ├── 06-translator.yaml
│   ├── 07-ingress.yaml
│   ├── backend-configmap.yml
│   └── backend-service.yml
├── helm/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── docker-compose.yml
└── docker-compose.test.yml
```

---

## 🚀 CI/CD Pipelines

### Frontend Pipeline (`ci-frontend.yaml`)

```
Push to main
    ↓
Build — Verify frontend files
    ↓
Deploy to S3 (via OIDC — no static credentials)
    ↓
Git Tag (auto versioning)
```

**Key features:**
- Uses AWS OIDC for secure authentication (no Access Keys)
- Syncs only relevant files to S3 (excludes Dockerfile, nginx.conf)
- Auto versioning with Git tags

---

### Backend Pipeline (`ci-backend.yaml`)

```
Push to main/ci-cd
    ↓
Unit Tests (Node.js)
    ↓
Build Docker Image
    ↓
Integration Tests (Docker Compose)
    ↓
Push to ECR (AWS Elastic Container Registry)
    ↓
CD — Deploy to EC2 via SSH        ← Continuous Deployment
    ↓
Git Tag (auto versioning)
```

**Key features:**
- Full test suite before any deployment
- Docker image pushed to private AWS ECR (not DockerHub)
- Automatic deployment to EC2 on every push to main
- Zero-downtime via `docker compose up -d`
- OIDC authentication — no hardcoded credentials anywhere

---

## ☸️ Kubernetes Deployment

The application is fully orchestrated with Kubernetes:

| Resource | Type | Description |
|----------|------|-------------|
| backend | Deployment | Node.js API (2 replicas) |
| frontend | Deployment | Nginx static server |
| translator | Deployment | LibreTranslate engine |
| postgres | StatefulSet | PostgreSQL with persistent storage |
| backend-service | ClusterIP | Internal backend routing |
| frontend-service | ClusterIP | Internal frontend routing |
| postgres-service | Headless | Stable DB DNS |
| ingress | Nginx Ingress | Routes `/api/*` → backend, `/` → frontend |

### Deploy with Kubernetes:
```bash
kubectl apply -f k8s/
```

### Deploy with Helm:
```bash
helm install app-translator ./helm
```

---

## ☁️ AWS Infrastructure

| Service | Usage |
|---------|-------|
| S3 | Frontend static website hosting |
| EC2 (t3.micro) | Backend runtime (Docker) |
| ECR | Private Docker image registry |
| IAM OIDC | Secure GitHub Actions authentication |
| IAM Role | `github-actions-s3-role` with minimal permissions |

### Security highlights:
- ✅ No static AWS credentials — uses OIDC tokens
- ✅ IAM Role with least-privilege permissions
- ✅ S3 Bucket Policy restricts to `s3:GetObject` only
- ✅ SSH key stored as GitHub Secret only
- ✅ EC2 IAM Role with ECR read-only access

---

## 🔐 GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM Role ARN for OIDC |
| `AWS_REGION` | AWS region (eu-north-1) |
| `S3_BUCKET_NAME` | Frontend S3 bucket name |
| `ECR_REGISTRY` | ECR registry URL |
| `EC2_HOST` | EC2 public DNS |
| `EC2_SSH_KEY` | EC2 private key (.pem content) |
| `DOCKERHUB_USERNAME` | DockerHub username |
| `DOCKERHUB_TOKEN` | DockerHub access token |

---

## 🏃 Run Locally

### With Docker Compose:
```bash
docker compose up -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend | http://localhost:3001 |
| LibreTranslate | http://localhost:5000 |

### Run Tests:
```bash
# Unit tests
cd backend && npm test

# Integration tests
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## 🔄 How It Works

1. User visits the frontend (S3)
2. Types text and clicks "Translate"
3. Request goes to `/api/translate` → EC2 Backend
4. Backend calls LibreTranslate for translation
5. Result is saved to PostgreSQL
6. Translation is returned to the user
7. History is loaded from the database

---

## 📌 Key DevOps Concepts Applied

- **CI/CD** — Automated testing and deployment on every push
- **Infrastructure as Code** — Kubernetes manifests + Helm charts
- **Least Privilege** — IAM roles with minimal permissions
- **Secrets Management** — GitHub Secrets + AWS OIDC
- **Health Checks** — Liveness & Readiness probes on all services
- **Auto Versioning** — Git tags created automatically after each successful deploy
- **Containerization** — All services run in Docker containers
