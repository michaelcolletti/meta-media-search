# Meta-Media-Search

**AI-Native Visual Discovery Map for Media Content**

Inspired by the revolutionary Kartoo visual search engine, Meta-Media-Search solves the "30-minute paradox" — where millions spend up to 30 minutes every night deciding what to watch, wasting billions of hours daily due to content fragmentation across streaming platforms.

## 🎯 The Vision

Pioneer the world's first AI-native discovery map that empowers users to instantly surface the best content options through natural, intuitive prompts and viewing preferences.

## ✨ Key Features

- **Natural Language Search**: Ask questions like "funny sci-fi movies like The Martian"
- **Interactive Visual Map**: Explore content relationships through an interactive node-based visualization
- **Multi-Platform Aggregation**: Search across Netflix, Hulu, Disney+, Amazon Prime, HBO, and more
- **AI-Powered Recommendations**: Personalized suggestions based on your preferences and viewing history
- **Context-Aware Discovery**: Find content based on mood, time, companions, and context

## 🏗️ Architecture

### Backend
- **Node.js + TypeScript + Express**: RESTful API server
- **LangChain + OpenAI**: Natural language processing and semantic search
- **PostgreSQL + Vector DB**: Content metadata and semantic embeddings
- **Redis**: Caching layer for performance
- **TMDB API**: Movie and TV show metadata

### Frontend
- **React + TypeScript**: Modern UI framework
- **Vite**: Fast build tooling
- **Cytoscape.js**: Interactive graph visualization
- **TanStack Query**: Server state management
- **Zustand**: Client state management

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis >= 6
- OpenAI API key
- TMDB API key

### Installation

```bash
# Clone the repository
git clone https://github.com/michaelcolletti/meta-media-search.git
cd meta-media-search

# Install dependencies
npm install

# Set up environment variables
cp config/.env.example .env
# Edit .env with your API keys

# Start development servers
npm run dev
```

This will start:
- Backend API on `http://localhost:3000`
- Frontend app on `http://localhost:5173`

### Environment Variables

See `config/.env.example` for required configuration:

```env
# AI Services
OPENAI_API_KEY=your_key_here
TMDB_API_KEY=your_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/meta_media_search
REDIS_URL=redis://localhost:6379
```

## 📖 API Documentation

See [docs/api/API_DOCUMENTATION.md](docs/api/API_DOCUMENTATION.md) for complete API reference.

### Example API Call

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "funny sci-fi movies like The Martian",
    "filters": {
      "platforms": ["Netflix", "Hulu"],
      "yearRange": { "min": 2010, "max": 2024 }
    }
  }'
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## 🏃 Development

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Both concurrently
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📦 Building for Production

```bash
# Build all
npm run build

# Start production server
npm start
```

## 🎨 Project Structure

```
meta-media-search/
├── src/
│   ├── backend/          # Backend API
│   │   ├── index.ts      # Server entry point
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Express middleware
│   └── frontend/         # React application
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── hooks/       # Custom hooks
│       │   └── App.tsx      # Main app component
│       └── index.html
├── tests/                # Test suites
├── docs/                 # Documentation
└── config/               # Configuration files
```

## 🛣️ Roadmap

- [x] Basic search with natural language
- [x] Visual discovery map
- [ ] User authentication
- [ ] Personalized recommendations
- [ ] Watchlist and favorites
- [ ] Social sharing
- [ ] Mobile app
- [ ] Browser extension

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Inspired by [Kartoo](https://en.wikipedia.org/wiki/KartOO), the pioneering visual search engine (2001-2010)
- Built using [rUv's SPARC methodology](https://github.com/ruvnet/claude-flow) and agentic engineering practices
- Powered by OpenAI's language models and TMDB's comprehensive media database

## 📞 Support

- GitHub Issues: [https://github.com/michaelcolletti/meta-media-search/issues](https://github.com/michaelcolletti/meta-media-search/issues)
- Documentation: [docs/](docs/)

---

**Made with ❤️ to solve the content discovery crisis**
