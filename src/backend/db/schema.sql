-- Meta-Media-Search Database Schema

-- Enable vector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP WITH TIME ZONE
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  favorite_genres TEXT[],
  disliked_genres TEXT[],
  preferred_platforms TEXT[],
  age_rating_preference VARCHAR(20),
  language_preference VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Media content cache
CREATE TABLE IF NOT EXISTS media_content (
  id VARCHAR(100) PRIMARY KEY,  -- Format: "tmdb-12345"
  external_id VARCHAR(100) NOT NULL,
  source VARCHAR(50) NOT NULL,  -- 'tmdb', 'imdb', etc.
  title VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,    -- 'movie', 'tv', 'documentary'
  genres TEXT[],
  platforms TEXT[],
  rating DECIMAL(3,1),
  year INTEGER,
  description TEXT,
  image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_content_type ON media_content(type);
CREATE INDEX idx_media_content_year ON media_content(year);
CREATE INDEX idx_media_content_genres ON media_content USING GIN(genres);
CREATE INDEX idx_media_content_platforms ON media_content USING GIN(platforms);

-- Semantic embeddings for content
CREATE TABLE IF NOT EXISTS content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id VARCHAR(100) REFERENCES media_content(id) ON DELETE CASCADE,
  embedding vector(1536),  -- OpenAI ada-002 embedding dimension
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_id)
);

CREATE INDEX ON content_embeddings USING ivfflat (embedding vector_cosine_ops);

-- User viewing history
CREATE TABLE IF NOT EXISTS viewing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id VARCHAR(100) REFERENCES media_content(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  rating DECIMAL(3,1),
  completed BOOLEAN DEFAULT false
);

CREATE INDEX idx_viewing_history_user ON viewing_history(user_id);
CREATE INDEX idx_viewing_history_content ON viewing_history(content_id);
CREATE INDEX idx_viewing_history_watched_at ON viewing_history(watched_at);

-- User watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_watchlists_user ON watchlists(user_id);

-- Watchlist items
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID REFERENCES watchlists(id) ON DELETE CASCADE,
  content_id VARCHAR(100) REFERENCES media_content(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  UNIQUE(watchlist_id, content_id)
);

CREATE INDEX idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_content ON watchlist_items(content_id);

-- Search queries log (for analytics and improvement)
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  processed_query JSONB,
  results_count INTEGER,
  clicked_content_ids TEXT[],
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_queries_user ON search_queries(user_id);
CREATE INDEX idx_search_queries_session ON search_queries(session_id);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);

-- Content similarity cache
CREATE TABLE IF NOT EXISTS content_similarities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id_a VARCHAR(100) REFERENCES media_content(id) ON DELETE CASCADE,
  content_id_b VARCHAR(100) REFERENCES media_content(id) ON DELETE CASCADE,
  similarity_score DECIMAL(4,3),  -- 0.000 to 1.000
  calculation_method VARCHAR(50),  -- 'genre', 'embedding', 'hybrid'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(content_id_a, content_id_b, calculation_method)
);

CREATE INDEX idx_similarities_a ON content_similarities(content_id_a, similarity_score);
CREATE INDEX idx_similarities_b ON content_similarities(content_id_b, similarity_score);

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_content_updated_at BEFORE UPDATE ON media_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlists_updated_at BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts and authentication';
COMMENT ON TABLE user_preferences IS 'User viewing preferences and filters';
COMMENT ON TABLE media_content IS 'Cached media content from external sources';
COMMENT ON TABLE content_embeddings IS 'Semantic vector embeddings for similarity search';
COMMENT ON TABLE viewing_history IS 'User watch history and ratings';
COMMENT ON TABLE watchlists IS 'User-created watchlists';
COMMENT ON TABLE watchlist_items IS 'Content items in watchlists';
COMMENT ON TABLE search_queries IS 'Search query log for analytics';
COMMENT ON TABLE content_similarities IS 'Pre-calculated content similarity scores';
