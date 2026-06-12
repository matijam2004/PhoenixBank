# Docker Setup Guide

This guide explains how to run the Phoenix Banking application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Docker version 20.10+
- Docker Compose version 2.0+

## Quick Start

1. **Clone the repository and navigate to infra directory:**
   ```bash
   git clone <repository-url>
   cd bank-app/infra
   ```

2. **Create environment file (optional - defaults will work):**
   ```bash
   cp env.example .env
   ```
   Edit `.env` and set your values (optional):
   - `OPENAI_API_KEY` (optional, but required for check processing features)
   - `VITE_API_URL` (default: `http://localhost:8000/api` - usually no need to change)
   - `DB_NAME` (default: `phoenix` - usually no need to change)
   
   **Note:** If you don't create a `.env` file, Docker Compose will use default values which should work for most cases.

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Check service status:**
   ```bash
   docker-compose ps
   ```

5. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f mongo
   ```

## Services

### MongoDB (Database)
- **Port:** 27017
- **Container:** bank-app-mongo
- **Volume:** Persistent data stored in `mongo-data` volume

### Backend (FastAPI)
- **Port:** 8000
- **Container:** bank-app-backend
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/api/health
- **Hot Reload:** Enabled (code changes trigger automatic reload)

### Frontend (React/Vite)
- **Port:** 80 (HTTP)
- **Container:** bank-app-frontend
- **URL:** http://localhost
- **Build:** Production build served via Nginx

## Environment Variables

### Backend Environment Variables

Set these in `infra/.env`:

- `MONGO_URI`: MongoDB connection string (auto-set to `mongodb://mongo:27017/` in Docker)
- `DB_NAME`: Database name (default: `phoenix`)
- `OPENAI_API_KEY`: OpenAI API key for check processing (optional)

### Frontend Environment Variables

Set these in `infra/.env`:

- `VITE_API_URL`: Backend API URL (default: `http://localhost:8000/api`)

## Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### Rebuild services
```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build
```

### View logs
```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongo

# Last 100 lines
docker-compose logs --tail=100
```

### Execute commands in containers
```bash
# Backend shell
docker-compose exec backend bash

# MongoDB shell
docker-compose exec mongo mongosh

# Frontend shell (if needed)
docker-compose exec frontend sh
```

### Restart a service
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart mongo
```

## Development vs Production

### Development Mode (Current Setup)
- Backend runs with `--reload` flag (auto-reloads on code changes)
- Backend code is mounted as volume for live updates
- Frontend is built once and served via Nginx

### Production Mode (Recommended for Deployment)
1. Remove `--reload` from backend command in `docker-compose.yml`
2. Remove volume mount for backend (line: `- ../backend:/app`)
3. Rebuild images without development dependencies
4. Use environment-specific `.env` files
5. Consider using Docker secrets for sensitive data

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Verify Docker is running
docker ps

# Check port conflicts
# Ensure ports 80, 8000, and 27017 are not in use
```

### Backend can't connect to MongoDB
- Verify MongoDB container is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`
- Ensure `MONGO_URI` is set correctly (should be `mongodb://mongo:27017/`)

### Frontend can't reach backend
- Check `VITE_API_URL` in `.env` file
- Verify backend is running: `docker-compose ps`
- Check network: `docker network ls`
- Test backend health: `curl http://localhost:8000/api/health`

### Port already in use
If ports are already in use:
1. Stop the conflicting service
2. Or change ports in `docker-compose.yml`:
   ```yaml
   ports:
     - "8080:8000"  # Change 8000 to 8080
   ```

### Database data persistence
- Data persists in Docker volume `mongo-data`
- To reset database: `docker-compose down -v`
- To backup: `docker-compose exec mongo mongodump --out /data/backup`

### Rebuild after dependency changes
```bash
# After changing requirements.txt
docker-compose build backend
docker-compose up -d backend

# After changing package.json
docker-compose build frontend
docker-compose up -d frontend
```

## Accessing the Application

- **Frontend:** http://localhost
- **Backend API:** http://localhost:8000
- **API Documentation:** http://localhost:8000/docs
- **MongoDB:** localhost:27017

## Seed Data (Optional)

If you have seed data in `infra/seed/`, you can import it:

```bash
# Connect to MongoDB
docker-compose exec mongo mongosh phoenix

# Import seed data (example)
docker-compose exec mongo mongosh phoenix --eval "db.customers.insertMany([...])"
```

## Network

All services communicate via the `bank-app-network` Docker network. Services can reach each other using their service names:
- `mongo` - MongoDB service
- `backend` - FastAPI backend
- `frontend` - React frontend

