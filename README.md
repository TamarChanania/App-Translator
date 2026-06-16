# 🌐 App Translator — Full DevOps Project

A full-stack translation application built step by step — from a single Docker container all the way to a full CI/CD pipeline with Kubernetes and AWS.

---

## 🏗️ How It Was Built — Evolution of the Architecture

The project was built in 5 progressive stages, each one adding a layer of DevOps maturity.

---

## שלב 1 — ארכיטקטורה ראשונית (Docker Compose - ידני)

The starting point. All services running manually in a shared Docker network.

```
User
 │
 ▼
frontend:8080 (Nginx)
 │   HTTP Fetch
 ▼
backend:3001 (Node.js)
 │              │
 ▼              ▼
db:5432      translator:5000
(PostgreSQL) (LibreTranslate)
```

- Single `docker-compose.yml` with a shared `appnet` bridge network
- No Dockerfiles yet — services used pre-built images
- Manual `docker compose up` to run everything

---

## שלב 2 — Dockerfiles (Frontend + Backend)

Added custom Dockerfiles for both frontend and backend.

```
frontend/Dockerfile   →  nginx:alpine  + static files
backend/Dockerfile    →  node:18-alpine + server.js
```

- Frontend: Nginx serves `index.html` + `script.js`
- Backend: Node.js runs `server.js` on port 3001
- Both images now buildable locally with `docker build`

---

## שלב 3 — Docker Compose מלא

Updated `docker-compose.yml` to build from local Dockerfiles instead of pulling images.

```yaml
Services:   frontend | backend | db | translator
Networks:   appnet (bridge)
Volumes:    db_data | init.sql
```

- `backend` waits for `db` via `healthcheck` + `depends_on`
- `init.sql` auto-creates the `translations` table on first run
- Added `docker-compose.test.yml` for running integration tests in isolation

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

## שלב 4 — Kubernetes (K8s)

Migrated from Docker Compose to full Kubernetes orchestration.

```
User / Browser
      │
      ▼
Ingress (nginx-ingress)
  /        →  frontend-service  →  Deployment (frontend)  →  Pods
  /api/*   →  backend-service   →  Deployment (backend)   →  Pods
                                         │
                                         ▼
                               translator-service  →  Deployment (translator)
                                         │
                                         ▼
                               postgres-service (Headless)
                                         │
                                         ▼
                               StatefulSet (postgres)  →  PersistentVolume
```

| Resource | Kind | Description |
|----------|------|-------------|
| backend | Deployment | Node.js API, 2 replicas |
| frontend | Deployment | Nginx static server |
| translator | Deployment | LibreTranslate engine |
| postgres | StatefulSet | PostgreSQL with persistent storage |
| backend-service | ClusterIP | Internal backend routing |
| frontend-service | ClusterIP | Internal frontend routing |
| postgres-service | Headless | Stable DNS for StatefulSet |
| ingress | Nginx Ingress | Routes traffic to services |

- ConfigMap for `init.sql` — DB schema injected at startup
- Secret for postgres password (base64 encoded)
- Liveness & Readiness probes on all services

**Deploy:**
```bash
kubectl apply -f k8s/
```

---

## שלב 5 — Helm Chart + Extras

Packaged the entire Kubernetes setup as a Helm chart for reusable, configurable deployments.

```
User / Browser
      │
      ▼
Ingress (nginx-ingress)
      │
      ▼
Helm Chart: app-translator
 ├── frontend   Deployment
 ├── backend    Deployment
 ├── translator Deployment
 ├── postgres   Deployment (StatefulSet)
 ├── ConfigMap  (init.sql)
 └── Secret     (db-credentials)
```

**Extras added at this stage:**
- Liveness & Readiness probes on all services
- PersistentVolume for PostgreSQL data
- ReplicaSets + scaling via `values.yaml`

All configuration lives in `helm/values.yaml` — single source of truth.

**Deploy with Helm:**
```bash
helm install app-translator ./helm
```

---

## שלב 6 — CI/CD (GitHub Actions)

Automated the full build, test, and deploy pipeline.

### Frontend Pipeline (`ci-cd-frontend.yaml`)

```
Push to main
    ↓
Build — Verify frontend files
    ↓
Deploy to S3 (via OIDC — no static credentials)
    ↓
Git Tag (auto versioning)
```

### Backend Pipeline (`ci-cd-backend.yaml`)

```
Push to main
    ↓
Unit Tests (Node.js)
    ↓
Build Docker Image
    ↓
Integration Tests (Docker Compose)
    ↓
Push to ECR (AWS Elastic Container Registry)
    ↓
Deploy to EC2 via SSH
    ↓
Git Tag (auto versioning)
```

**Security — no static credentials anywhere:**
- GitHub Actions authenticates to AWS via OIDC tokens
- SSH key stored as GitHub Secret only
- EC2 IAM Role with ECR read-only access

---

## ☁️ AWS Infrastructure

| Service | Usage |
|---------|-------|
| S3 | Frontend static website hosting |
| EC2 (t3.micro) | Backend runtime (Docker) |
| ECR | Private Docker image registry |
| IAM OIDC | Secure GitHub Actions authentication |
| IAM Role | `github-actions-s3-role` with minimal permissions |

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

---

## 📁 Project Structure

```
App-Translator/
├── .github/
│   └── workflows/
│       ├── ci-cd-frontend.yaml   # CI/CD for frontend → S3
│       └── ci-cd-backend.yaml    # CI/CD for backend → ECR → EC2
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
│   └── 07-ingress.yaml
├── helm/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── docker-compose.yml
└── docker-compose.test.yml
```

---

## 📌 Key DevOps Concepts Applied

- **Containerization** — All services run in Docker containers
- **CI/CD** — Automated testing and deployment on every push
- **Infrastructure as Code** — Kubernetes manifests + Helm charts
- **Least Privilege** — IAM roles with minimal permissions
- **Secrets Management** — GitHub Secrets + AWS OIDC
- **Health Checks** — Liveness & Readiness probes on all services
- **Auto Versioning** — Git tags created automatically after each successful deploy
- **Persistent Storage** — PostgreSQL data survives pod restarts
