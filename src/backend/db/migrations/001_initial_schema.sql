-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferences JSONB DEFAULT '{}'::jsonb,
    watch_history TEXT[] DEFAULT ARRAY[]::TEXT[],
    favorites TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Media items table
CREATE TABLE IF NOT EXISTS media_items (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    genres TEXT[] DEFAULT ARRAY[]::TEXT[],
    release_date DATE,
    rating DECIMAL(3,1),
    thumbnail VARCHAR(500),
    poster_url VARCHAR(500),
    backdrop_url VARCHAR(500),
    trailer_url VARCHAR(500),
    director VARCHAR(255),
    duration INTEGER,
    seasons INTEGER,
    episodes INTEGER,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_items_type ON media_items(type);
CREATE INDEX idx_media_items_rating ON media_items(rating DESC);
CREATE INDEX idx_media_items_release_date ON media_items(release_date DESC);
CREATE INDEX idx_media_items_genres ON media_items USING GIN(genres);
CREATE INDEX idx_media_items_embedding ON media_items USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Platforms table
CREATE TABLE IF NOT EXISTS platforms (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    logo VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_platforms_type ON platforms(type);

-- Media platforms junction table
CREATE TABLE IF NOT EXISTS media_platforms (
    media_id VARCHAR(255) REFERENCES media_items(id) ON DELETE CASCADE,
    platform_id VARCHAR(255) REFERENCES platforms(id) ON DELETE CASCADE,
    url VARCHAR(500),
    price DECIMAL(10,2),
    currency VARCHAR(3),
    quality TEXT[],
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (media_id, platform_id)
);

CREATE INDEX idx_media_platforms_media_id ON media_platforms(media_id);
CREATE INDEX idx_media_platforms_platform_id ON media_platforms(platform_id);

-- Cast members table
CREATE TABLE IF NOT EXISTS cast_members (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    profile_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Media cast junction table
CREATE TABLE IF NOT EXISTS media_cast (
    media_id VARCHAR(255) REFERENCES media_items(id) ON DELETE CASCADE,
    cast_id VARCHAR(255) REFERENCES cast_members(id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    cast_order INTEGER,
    PRIMARY KEY (media_id, cast_id)
);

CREATE INDEX idx_media_cast_media_id ON media_cast(media_id);
CREATE INDEX idx_media_cast_cast_id ON media_cast(cast_id);

-- Search history table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    results_count INTEGER,
    processing_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_search_history_created_at ON search_history(created_at DESC);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    media_id VARCHAR(255) REFERENCES media_items(id) ON DELETE CASCADE,
    score DECIMAL(3,2),
    reasoning TEXT,
    factors JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX idx_recommendations_score ON recommendations(score DESC);
CREATE INDEX idx_recommendations_created_at ON recommendations(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_items_updated_at BEFORE UPDATE ON media_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Full text search indexes
CREATE INDEX idx_media_items_title_fts ON media_items
    USING gin(to_tsvector('english', title));

CREATE INDEX idx_media_items_description_fts ON media_items
    USING gin(to_tsvector('english', description));
