# Getting Started with Meta-Media-Search

This guide will help you set up and run Meta-Media-Search on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **PostgreSQL** >= 14 ([Download](https://www.postgresql.org/download/))
- **Redis** >= 6 ([Download](https://redis.io/download))
- **Git** ([Download](https://git-scm.com/downloads))

## Step 1: Clone the Repository

```bash
git clone https://github.com/michaelcolletti/meta-media-search.git
cd meta-media-search
```

## Step 2: Install Dependencies

```bash
npm install
```

This will install all backend and frontend dependencies.

## Step 3: Set Up API Keys

You'll need API keys from the following services:

### OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (you won't be able to see it again)

### TMDB API Key

1. Go to [TMDB](https://www.themoviedb.org/)
2. Create an account
3. Go to Settings → API
4. Request an API key (it's free)
5. Copy the API key

## Step 4: Configure Environment Variables

```bash
# Copy the example environment file
cp config/.env.example .env

# Edit the .env file with your favorite editor
nano .env  # or vim .env, or code .env
```

Update the following values in `.env`:

```env
# AI Services - REQUIRED
OPENAI_API_KEY=sk-your-openai-key-here
TMDB_API_KEY=your-tmdb-api-key-here

# Database - Update if different
DATABASE_URL=postgresql://user:password@localhost:5432/meta_media_search
REDIS_URL=redis://localhost:6379

# Server - Can keep defaults
PORT=3000
NODE_ENV=development
```

## Step 5: Set Up PostgreSQL

### Create the Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql, run:
CREATE DATABASE meta_media_search;
CREATE USER meta_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE meta_media_search TO meta_user;

# Enable vector extension (for semantic search)
\c meta_media_search
CREATE EXTENSION IF NOT EXISTS vector;
```

### Run Migrations

```bash
npm run migrate
```

## Step 6: Start Redis

```bash
# On macOS with Homebrew
brew services start redis

# Or run in foreground
redis-server

# Verify it's running
redis-cli ping
# Should return: PONG
```

## Step 7: Start the Development Servers

```bash
# Start both backend and frontend concurrently
npm run dev
```

This will start:
- **Backend API** on http://localhost:3000
- **Frontend** on http://localhost:5173

## Step 8: Verify Everything Works

### Test the Backend

```bash
# Health check
curl http://localhost:3000/health

# Should return:
# {"status":"healthy","service":"meta-media-search","timestamp":"..."}
```

### Test the Frontend

1. Open your browser to http://localhost:5173
2. You should see the Meta-Media-Search homepage
3. Try searching for "funny sci-fi movies like The Martian"

## Common Issues & Solutions

### Port Already in Use

If port 3000 or 5173 is already in use:

```bash
# Change the port in .env
PORT=3001  # for backend

# For frontend, edit src/frontend/vite.config.ts
server: {
  port: 5174  # change this
}
```

### Database Connection Error

```bash
# Verify PostgreSQL is running
pg_isready

# Check connection string in .env matches your setup
# Format: postgresql://username:password@host:port/database
```

### Redis Connection Error

```bash
# Verify Redis is running
redis-cli ping

# If not running, start it:
brew services start redis  # macOS
sudo systemctl start redis  # Linux
```

### OpenAI API Key Invalid

- Double-check you copied the entire key (starts with `sk-`)
- Verify the key is active in your OpenAI dashboard
- Check your OpenAI account has available credits

### TMDB API Errors

- Verify your API key is correct
- TMDB has rate limits (40 requests per 10 seconds for free tier)
- Check your API key is activated (can take a few minutes)

## Development Workflow

### Running Backend Only

```bash
npm run dev:backend
```

### Running Frontend Only

```bash
npm run dev:frontend
```

### Running Tests

```bash
# All tests
npm test

# Unit tests with watch mode
npm run test:unit:watch

# With coverage
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

## Next Steps

Once everything is running:

1. **Read the [API Documentation](api/API_DOCUMENTATION.md)** to understand available endpoints
2. **Explore the [Architecture](architecture/ARCHITECTURE.md)** to understand how the system works
3. **Try different searches** to see the AI-powered query processing
4. **Explore the visual discovery map** - click nodes, zoom, and pan

## Need Help?

- Check the [README](../README.md) for more information
- Review [API Documentation](api/API_DOCUMENTATION.md)
- Open an issue on [GitHub](https://github.com/michaelcolletti/meta-media-search/issues)

## Tips for Development

- **Hot Reload**: Both frontend and backend support hot reload during development
- **Database Seeding**: Use `npm run seed` to populate with sample data
- **API Testing**: Use Postman, Insomnia, or curl to test API endpoints
- **Browser DevTools**: Use React DevTools and Network tab for debugging

Happy coding! 🚀
