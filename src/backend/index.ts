import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchRouter } from './routes/search.js';
import { discoverRouter } from './routes/discover.js';
import { recommendationsRouter } from './routes/recommendations.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'meta-media-search',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/search', searchRouter);
app.use('/api/discover', discoverRouter);
app.use('/api/recommendations', recommendationsRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Meta-Media-Search API running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
});

export default app;
