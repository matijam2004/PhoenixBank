# Bank App - Setup Instructions for Testing Team

## Prerequisites

- **Docker Desktop** installed and running
- **Git** (if cloning from repository)

## Quick Setup (5 minutes)

### Step 1: Navigate to the project

```bash
cd bank-app/infra
```

### Step 2: Create environment file

```bash
cp env.example .env
```

### Step 3: Edit `.env` file

Open `.env` and set these values (if not already set):

- `GOOGLE_CLIENT_ID` - Get from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
- `JWT_SECRET` - Use a secure random string (or leave default for testing)

### Step 4: Start the application

```bash
docker-compose up -d
```

This will:

- Start MongoDB (with replica set for transactions)
- Build and start the backend API
- Build and start the frontend

### Step 5: Wait for services to be ready

```bash
docker-compose ps
```

Wait until all services show "healthy" status (about 30-60 seconds).

### Step 6: Access the application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000/api
- **API Documentation**: http://localhost:8000/docs

## Important Notes

### MongoDB

- **Only Docker MongoDB is used** - No local MongoDB needed
- Data persists in Docker volume `mongo-data`
- If you need to reset data: `docker-compose down -v` (WARNING: This deletes all data)

### Ports Used

- `80` - Frontend (nginx)
- `8000` - Backend API
- `27017` - MongoDB (internal, not exposed to other machines)

### Stopping the Application

```bash
cd infra
docker-compose down
```

### Viewing Logs

```bash
cd infra
docker-compose logs -f          # All services
docker-compose logs backend     # Backend only
docker-compose logs frontend    # Frontend only
docker-compose logs mongo       # MongoDB only
```

### Restarting Services

```bash
cd infra
docker-compose restart         # Restart all
docker-compose restart backend  # Restart backend only
```

## Troubleshooting

### "Port already in use" error

- Check if another application is using port 80 or 8000
- Stop other services or change ports in `docker-compose.yml`

### "Cannot connect to MongoDB"

- Wait a bit longer (MongoDB takes ~15 seconds to start)
- Check logs: `docker-compose logs mongo`
- Verify replica set initialized: `docker-compose logs mongo-init`

### "Google OAuth not working"

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check Google Console has redirect URI: `http://localhost/api/auth/google/callback`
- Check Google Console has JavaScript origin: `http://localhost`

### Services won't start

```bash
# Rebuild everything
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Need to reset everything

```bash
# WARNING: This deletes all data
docker-compose down -v
docker-compose up -d
```

## Testing Checklist

- [ ] Frontend loads at http://localhost
- [ ] Can create a new account (signup)
- [ ] Can login with email/password
- [ ] Can login with Google OAuth
- [ ] Can view dashboard after login
- [ ] API health check works: http://localhost:8000/api/health

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Verify all services are running: `docker-compose ps`
3. Try restarting: `docker-compose restart`
