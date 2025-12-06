# Getting Started with Meta-Media-Search

Complete guide to set up and run the project locally.

## Prerequisites

### Required Software

1. **Node.js 20 LTS** (recommended) or 18+
   ```bash
   # Using nvm (recommended)
   nvm install 20
   nvm use 20
   nvm alias default 20
   ```

2. **Rust + wasm-pack** (for WASM compilation)
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install wasm-pack
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```

3. **PostgreSQL 14+**
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14
   
   # Ubuntu/Debian
   sudo apt-get install postgresql-14
   sudo systemctl start postgresql
   ```

4. **Redis 6+**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu/Debian
   sudo apt-get install redis-server
   sudo systemctl start redis
   ```

### API Keys

Get free API keys from:
- **OpenAI**: https://platform.openai.com/api-keys
- **TMDB**: https://www.themoviedb.org/settings/api

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/michaelcolletti/meta-media-search.git
cd meta-media-search
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build WASM Components

```bash
cd src/rust-wasm
wasm-pack build --release --target web --out-dir pkg
cd ../..
```

### 4. Configure Environment

```bash
cp config/.env.example .env
```

Edit `.env` with your API keys:
```env
# AI Services
OPENAI_API_KEY=sk-your-key-here
TMDB_API_KEY=your-tmdb-key

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/meta_media_search
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1
ALLOWED_ORIGINS=http://localhost:5173

# Performance
ENABLE_WASM=true
ENABLE_COMPRESSION=true
```

### 5. Set Up Database

```bash
# Create database
createdb meta_media_search

# Run migrations
npm run migrate

# Optional: Seed with sample data
npm run seed
```

### 6. Start Development Server

```bash
npm run dev
```

This starts:
- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Verify Installation

### 1. Check Services

```bash
# Backend health
curl http://localhost:3000/health

# Frontend
open http://localhost:5173
```

### 2. Run Tests

```bash
# All tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

### 3. Test WASM

```bash
cd src/rust-wasm
wasm-pack test --headless --firefox
```

## First Search

Try these searches in the UI:
- "funny sci-fi movies like The Martian"
- "relaxing shows for a quiet evening"
- "action movies from 2020"

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Verify connection
psql -U postgres -d meta_media_search -c "SELECT 1"
```

### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG
```

### WASM Build Errors

```bash
# Update Rust
rustup update

# Clean and rebuild
cd src/rust-wasm
cargo clean
wasm-pack build --release --target web
```

### Node.js Version Issues

```bash
# Switch to Node 20 LTS
nvm install 20
nvm use 20

# Clean install
rm -rf node_modules package-lock.json
npm install
```

## Development Workflow

### Hot Reload

Both backend and frontend have hot reload enabled:
- Backend watches `src/backend/**`
- Frontend watches `src/frontend/**`

### Code Quality

```bash
# Format code
npm run format

# Lint and fix
npm run lint:fix

# Type check
npm run typecheck
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit frequently
git add .
git commit -m "feat: Add my feature"

# Push to remote
git push origin feature/my-feature
```

## Next Steps

- Read [API Documentation](api/API_DOCUMENTATION.md)
- Explore [Architecture](ARCHITECTURE.md)
- Check [RuVector Integration](vector-db/ruvector-research.md)
- Learn about [AgentDB](vector-db/agentdb-integration.md)

## Common Tasks

### Add New API Endpoint

1. Create route in `src/backend/routes/`
2. Create controller in `src/backend/controllers/`
3. Create service in `src/backend/services/`
4. Add tests
5. Update API docs

### Add WASM Module

1. Create Rust module in `src/rust-wasm/src/`
2. Add WASM bindings
3. Build with `wasm-pack`
4. Import in TypeScript
5. Add tests

### Update Frontend Component

1. Edit component in `src/frontend/components/`
2. Update styles in corresponding `.css`
3. Add tests in `tests/frontend/`
4. Verify hot reload works

## Getting Help

- Check [Documentation](../)
- Open [GitHub Issue](https://github.com/michaelcolletti/meta-media-search/issues)
- Read [FAQ](FAQ.md)

Happy coding! 🚀
