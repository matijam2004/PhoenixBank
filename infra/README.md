# Bank App - Docker Production Setup

## Quick Start

1. **Stop local MongoDB** (if running):
   ```bash
   brew services stop mongodb-community
   ```

2. **Start Docker containers**:
   ```bash
   cd infra
   docker-compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000/api
   - API Docs: http://localhost:8000/docs

## Important Notes

### MongoDB Instance
- **Use Docker MongoDB only** - The Docker setup uses its own MongoDB instance
- Local MongoDB should be stopped to avoid conflicts
- Docker MongoDB is accessible at `localhost:27017` from your host machine
- Inside Docker, services connect via `mongodb://mongo:27017/` (Docker network)

### Environment Variables
Create a `.env` file in the `infra` directory:
```bash
cp env.example .env
# Edit .env with your actual values
```

Required variables:
- `GOOGLE_CLIENT_ID` - For Google OAuth login
- `GOOGLE_CLIENT_SECRET` - For Google OAuth login
- `JWT_SECRET` - Change this to a secure random string in production

### For Other Teams Testing

1. **Share the entire project** (or just the `infra` folder)
2. **They need Docker installed** (Docker Desktop)
3. **Instructions for them**:
   ```bash
   cd infra
   docker-compose up -d
   ```
4. **Access at**: http://localhost

### Stopping Local MongoDB (One-time setup)

If you have local MongoDB running via Homebrew:
```bash
brew services stop mongodb-community
```

To prevent it from auto-starting:
```bash
brew services list  # Check status
# If you want to completely disable it:
launchctl unload ~/Library/LaunchAgents/homebrew.mxcl.mongodb-community.plist
```

## Troubleshooting

### Port 27017 already in use
- Stop local MongoDB: `brew services stop mongodb-community`
- Or change Docker MongoDB port in `docker-compose.yml`

### Can't connect to MongoDB
- Check if Docker MongoDB is running: `docker-compose ps`
- Check logs: `docker-compose logs mongo`

### Google OAuth not working
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Verify redirect URI in Google Console: `http://localhost/api/auth/google/callback`
- Add `http://localhost` to Authorized JavaScript origins
