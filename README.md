# StockPilot — Cloud-Native Inventory Management

A full-stack inventory management application built with React and FastAPI, backed by PostgreSQL and deployed using Docker, Kubernetes, Helm, and AWS EKS. The project demonstrates automated testing, CI/CD, container security scanning, infrastructure as code, and application metrics.

## Overview

StockPilot helps users manage product inventory, monitor stock levels, and record stock movements through a web interface backed by a REST API.

The project combines application development with cloud-native deployment practices, including automated quality checks, containerization, Kubernetes orchestration, and infrastructure provisioning.

## Key Features

- **Inventory management:** Create, view, update, and delete products.
- **Product search:** Search inventory by product name and filter low-stock items.
- **Stock tracking:** Record stock-in and stock-out movements.
- **Input validation:** Handle invalid requests, duplicate SKUs, missing products, and insufficient stock.
- **Health checks:** Expose backend health endpoints for application and database status.
- **Automated testing:** Test API behavior using Pytest and an isolated in-memory SQLite database.
- **CI/CD automation:** Run tests and security checks, build Docker images, and publish images to GitHub Container Registry.
- **Infrastructure as code:** Define AWS networking and EKS resources using Terraform.
- **Kubernetes deployment:** Deploy application components with Kubernetes and Helm.
- **Application metrics:** Expose Prometheus-compatible metrics from the FastAPI backend.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Nginx |
| Backend | Python, FastAPI, SQLAlchemy |
| Database | PostgreSQL |
| Database migrations | Alembic |
| Testing | Pytest, SQLite |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Container registry | GitHub Container Registry (GHCR) |
| Security | Trivy, Gitleaks, pip-audit |
| Cloud infrastructure | AWS, Terraform, Amazon EKS |
| Orchestration | Kubernetes, Helm |
| Observability | Prometheus-compatible `/metrics` endpoint |

## Architecture

```text
                    ┌──────────────────────┐
                    │   React Frontend     │
                    │    Nginx Runtime     │
                    └──────────┬───────────┘
                               │ REST API
                    ┌──────────▼───────────┐
                    │    FastAPI Backend   │
                    │ Validation and Logic │
                    └──────────┬───────────┘
                               │ SQLAlchemy
                    ┌──────────▼───────────┐
                    │     PostgreSQL       │
                    │   Persistent Data    │
                    └──────────────────────┘
```

The application can run locally with Docker Compose or be deployed to Kubernetes. Terraform defines the AWS infrastructure, while Helm packages the Kubernetes application resources.

## Project Structure

```text
StockPilot/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── app/
│   ├── migrations/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── helm/
│   └── stockpilot/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── k8s/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── compose.yaml
└── README.md
```

## Run Locally

### Prerequisites

- Docker Engine
- Docker Compose
- Git

### 1. Clone the repository

```bash
git clone https://github.com/Isha22Patel/StockPilot.git
cd StockPilot
```

### 2. Configure the database password

Create a `.env` file in the repository root:

```dotenv
POSTGRES_PASSWORD=replace_with_a_local_password
```

Use a suitable local development password. Do not commit `.env` or real credentials.

### 3. Build and start the application

```bash
docker compose up --build -d
```

Check the running services:

```bash
docker compose ps
```

### 4. Access the application

- **Frontend:** http://localhost:5173
- **Backend health:** http://localhost:8000/health
- **Database health:** http://localhost:8000/health/db
- **API products:** http://localhost:8000/api/products/
- **Application metrics:** http://localhost:8000/metrics

### 5. Stop the application

```bash
docker compose down
```

The named PostgreSQL volume is retained by default. Avoid `docker compose down -v` unless you intentionally want to remove the local database volume.

## Testing

The backend test suite covers product operations, search and filtering, validation, and stock movements.

Run the tests from the repository root:

```bash
cd backend
.venv/bin/pytest -v
```

The test fixtures use an isolated in-memory SQLite database and override the application's database dependency. Tests therefore do not need to use the production PostgreSQL database.

## CI/CD Pipeline

The GitHub Actions workflow is located at `.github/workflows/ci.yml`. It runs on pushes and pull requests targeting `main`.

The workflow includes:

1. Checking out the source code.
2. Installing Python dependencies.
3. Auditing Python dependencies with `pip-audit`.
4. Running backend tests with Pytest.
5. Scanning the repository for secrets with Gitleaks.
6. Building backend and frontend Docker images.
7. Scanning both images for HIGH and CRITICAL vulnerabilities with Trivy.
8. Publishing versioned images to GHCR on pushes to `main`.

The image tags use the short Git commit SHA, with a `latest` tag published as well.

**Pipeline evidence:** Add a screenshot of a successful GitHub Actions run here.

## Docker

The backend and frontend have separate Dockerfiles. The frontend uses a multi-stage build to compile the React application and serve the static output with Nginx. Both application containers are configured to run as non-root users.

Docker Compose runs the frontend, backend, and PostgreSQL services together for local development.

**Docker evidence:** Add a screenshot showing all three services running successfully.

## Kubernetes and Helm

Kubernetes resources are organized under `k8s/`, and the Helm chart is under `helm/stockpilot/`.

Validate the chart:

```bash
helm lint helm/stockpilot
helm template stockpilot helm/stockpilot
```

Install or update the release in the `stockpilot` namespace:

```bash
helm upgrade --install stockpilot helm/stockpilot -n stockpilot
```

Inspect the release and workloads:

```bash
helm list -n stockpilot
kubectl get deployments,pods,services,ingress -n stockpilot
```

The chart defines backend and frontend Deployments, ClusterIP Services, and an Ingress with `/api` routed to the backend and `/` routed to the frontend.

An Ingress resource alone does not provide external access; an appropriate Ingress controller must also be installed and configured.

**Kubernetes evidence:** Add screenshots of the Helm release, workloads, Services, and working application access.

## Infrastructure as Code

Terraform files in `terraform/` define the AWS networking and EKS infrastructure, including the VPC, public and private subnets, IAM roles, EKS cluster, and worker node group.

Validate the configuration and review the proposed changes:

```bash
cd terraform
terraform init
terraform validate
terraform plan
```

Review plans carefully before applying changes. AWS resources can incur charges.

Terraform state, saved plans, credentials, and local environment files must not be committed to the repository.

**Terraform evidence:** Add screenshots of successful validation, a non-empty plan, the AWS infrastructure, and cleanup evidence if resources are destroyed for the assignment.

## Observability

The FastAPI backend exposes Prometheus-formatted metrics at `/metrics`.

For example:

```bash
curl http://localhost:8000/metrics
```

The endpoint provides runtime and application instrumentation metrics. Prometheus scraping, target health, and Grafana dashboards require a separately configured monitoring stack.

**Observability evidence:** Add screenshots of the metrics endpoint, Prometheus targets showing the application as UP, and a Grafana dashboard if configured.

## Security Practices

- Keep `.env` files and credentials out of version control.
- Use `.gitignore` for generated files, local environments, and Terraform state.
- Run application containers as non-root users.
- Audit Python dependencies with `pip-audit`.
- Scan repository secrets with Gitleaks.
- Scan container images with Trivy.
- Review infrastructure plans before applying changes.

## Demo and Submission Evidence

Use this section to organize the final assignment evidence:

- [ ] Application running in the browser
- [ ] Successful Pytest run
- [ ] GitHub repository and commit history
- [ ] Docker Compose services running
- [ ] Successful GitHub Actions pipeline
- [ ] Trivy scan results
- [ ] Terraform validation and plan
- [ ] AWS infrastructure evidence
- [ ] Helm release, Kubernetes workloads, and Services
- [ ] Working Ingress access
- [ ] Prometheus targets and Grafana dashboard, if available
- [ ] Short demo showing an inventory change and the deployment pipeline

## Project Repository

**GitHub:** https://github.com/Isha22Patel/StockPilot

---

*StockPilot is an educational cloud-native project demonstrating full-stack development, automated delivery, infrastructure as code, container security, and Kubernetes deployment.*
