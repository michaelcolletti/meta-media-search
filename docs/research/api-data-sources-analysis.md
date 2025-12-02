# API & Data Sources Analysis

## Executive Summary

This document provides detailed analysis of available APIs and data sources for building Meta-Media-Search, including rate limits, costs, attribution requirements, and integration recommendations.

---

## Primary Data Sources

### 1. The Movie Database (TMDB)

**Website:** https://www.themoviedb.org/
**API Docs:** https://developer.themoviedb.org/

#### Coverage

- **Movies:** 900,000+ titles
- **TV Shows:** 180,000+ series
- **People:** Millions of cast/crew records
- **Images:** Posters, backdrops, stills
- **Videos:** Trailers, clips, teasers
- **Languages:** 39 languages supported
- **Updates:** Real-time via webhooks

#### Data Available

✅ Comprehensive metadata (title, year, runtime, plot, tagline)
✅ Cast and crew (with character names, roles)
✅ Images (posters, backdrops, logos)
✅ Videos (trailers, teasers, clips)
✅ Genres and keywords
✅ User ratings and reviews
✅ Release dates by region
✅ Production companies and countries
✅ Translations in 39 languages
✅ Watch provider data (via JustWatch partnership)

❌ Direct streaming availability API access (must attribute JustWatch)
❌ Historical availability data
❌ Real-time streaming prices

#### API Endpoints (Key)

```
GET /movie/{movie_id}
GET /tv/{tv_id}
GET /search/movie?query={query}
GET /movie/{movie_id}/recommendations
GET /movie/{movie_id}/similar
GET /movie/{movie_id}/credits
GET /movie/{movie_id}/watch/providers
GET /discover/movie (with extensive filters)
GET /genre/movie/list
GET /person/{person_id}
```

#### Rate Limits

- **Free Tier:** 1,000 requests per day
- **Rate:** 50 requests per second
- **No cost** for API access
- **Attribution required:** TMDB logo and link

#### Strengths

✅ Comprehensive, high-quality metadata
✅ Free with generous rate limits
✅ Well-documented API
✅ Active community
✅ Regular updates
✅ Multi-language support
✅ Rich relationship data (similar, recommendations)

#### Limitations

⚠️ Cannot directly expose JustWatch streaming data
⚠️ Must make separate API calls for related data
⚠️ Rate limits may require caching strategy
⚠️ Some data quality inconsistencies (user-contributed)

#### Integration Strategy

1. **Initial Data Load:** Bulk import popular titles (top 50k)
2. **Daily Sync:** Update metadata for tracked titles
3. **On-Demand:** Fetch details for user-requested titles
4. **Caching:** 24-hour cache for metadata, 7 days for images
5. **Attribution:** TMDB logo in footer + dataset credits page

#### Cost Estimate

**Free** (API access)
**Infrastructure:** $50-200/month for image CDN/caching

---

### 2. JustWatch

**Website:** https://www.justwatch.com/
**API Docs:** https://apis.justwatch.com/docs/

#### Coverage

- **Services:** 600+ streaming services globally
- **Countries:** 140+ countries
- **Titles:** 400,000+ movies and shows
- **Data Points:** Availability, pricing, quality (HD/4K)
- **Updates:** Daily for availability changes

#### Data Available

✅ Streaming availability by country
✅ Rental/purchase pricing
✅ Video quality (SD/HD/4K)
✅ Service-specific URLs
✅ New releases tracking
✅ Popularity rankings
✅ Leaving-soon alerts
✅ Service catalog changes

❌ Not a public API (requires partnership)
❌ TMDB partnership for limited access
❌ Direct API access requires business agreement

#### API Access Options

**Option 1: Via TMDB (Limited)**

- Access through TMDB's `/watch/providers` endpoint
- Free but limited data exposure
- Must attribute both TMDB and JustWatch
- Cannot programmatically access all JustWatch data

**Option 2: Direct Partnership (Preferred)**

- Full API access to all data
- Real-time updates
- Custom integrations
- Requires business agreement and likely costs

**Option 3: Web Scraping (Not Recommended)**

- Violates Terms of Service
- Unreliable and brittle
- Legal risks
- Not sustainable

#### Attribution Requirements

**Mandatory:**

- "Streaming data provided by JustWatch" text
- JustWatch logo with link to JustWatch.com
- Non-compliance results in API access revocation
- Prominently displayed on all pages using data

#### Strengths

✅ Most comprehensive streaming availability data
✅ Global coverage (140+ countries)
✅ Real-time updates
✅ High accuracy
✅ Covers all major services
✅ Price tracking
✅ Quality indicators (HD/4K)

#### Limitations

⚠️ Not a public API (partnership required)
⚠️ Strict attribution requirements
⚠️ Limited access via TMDB
⚠️ Potential costs for full API access

#### Integration Strategy

1. **Phase 1 (MVP):** Use TMDB's watch providers endpoint
2. **Phase 2:** Apply for JustWatch partnership
3. **Phase 3:** Integrate full JustWatch API
4. **Caching:** Daily sync for availability, hourly for new releases
5. **Fallback:** User-reported availability if API unavailable

#### Cost Estimate

**Via TMDB:** Free (limited)
**Direct Partnership:** Unknown (requires negotiation)
**Estimate:** $500-2000/month for full access (speculation)

---

### 3. Watchmode API

**Website:** https://api.watchmode.com/
**API Docs:** https://api.watchmode.com/docs/

#### Coverage

- **Services:** 300+ streaming services
- **Countries:** 60+ countries
- **Titles:** 400,000+ movies and shows
- **ID Mappings:** IMDB, TMDB, JustWatch IDs
- **Updates:** Daily CSV exports

#### Data Available

✅ Streaming availability by region
✅ Service pricing
✅ ID mapping (IMDB ↔ TMDB ↔ JustWatch)
✅ Daily CSV updates
✅ Bulk data exports
✅ Title metadata
✅ Source tracking

❌ Less comprehensive than JustWatch
❌ Slower update frequency
❌ Paid API (no free tier)

#### API Endpoints (Key)

```
GET /title/{watchmode_id}/sources/
GET /title/{tmdb_id}/details/
GET /list-titles/ (with filters)
GET /search/ (search titles)
GET /autocomplete-search/
CSV Export: Daily full catalog dump
```

#### Pricing

- **Starter:** $29/month (10,000 API calls)
- **Growth:** $99/month (50,000 API calls)
- **Business:** $499/month (250,000 API calls)
- **Enterprise:** Custom pricing

#### Strengths

✅ Legitimate API with clear pricing
✅ ID mapping extremely useful
✅ Daily CSV exports for bulk processing
✅ Good documentation
✅ Reliable service
✅ No attribution requirements (unlike JustWatch)

#### Limitations

⚠️ Paid service (no free tier)
⚠️ Less comprehensive than JustWatch
⚠️ Daily updates (not real-time)
⚠️ Limited to 60 countries (vs JustWatch's 140)

#### Integration Strategy

1. **Use Case:** Primary source for production if JustWatch partnership not secured
2. **ID Mapping:** Critical for connecting TMDB + IMDB + JustWatch data
3. **Bulk Import:** Use daily CSV for initial database population
4. **API Calls:** On-demand for user queries and updates
5. **Caching:** Aggressive caching to stay within rate limits

#### Cost Estimate

**Growth Plan:** $99/month (sufficient for MVP)
**Business Plan:** $499/month (production scale)
**Annual:** $1,188 - $5,988/year

---

### 4. OMDb API (Alternative)

**Website:** https://www.omdbapi.com/
**API Docs:** https://www.omdbapi.com/

#### Coverage

- **Data Source:** IMDB (unofficial)
- **Movies:** Millions of titles
- **TV Shows:** Extensive coverage
- **Updates:** Daily

#### Data Available

✅ IMDB data (ratings, plot, cast)
✅ Rotten Tomatoes scores
✅ Poster images
✅ Episode data for TV series
✅ Search functionality

❌ No streaming availability
❌ Limited relationship data
❌ Unofficial IMDB scraping (legal gray area)
❌ Less comprehensive than TMDB

#### Pricing

- **Free:** 1,000 requests per day
- **Patreon ($1/month):** 10,000 requests per day
- **Patreon ($5/month):** 100,000 requests per day

#### Use Case for Meta-Media-Search

**Supplementary Data Only:**

- IMDB ratings (if not available via TMDB)
- Rotten Tomatoes scores
- Backup for metadata
- Cross-reference for data quality

#### Integration Strategy

**Secondary Source Only** - use TMDB as primary

---

### 5. Trakt.tv API

**Website:** https://trakt.tv/
**API Docs:** https://trakt.docs.apiary.io/

#### Coverage

- **Movies & TV:** Comprehensive catalog
- **User Data:** Watchlists, ratings, check-ins
- **Social:** Following, comments, lists
- **Tracking:** Watch history, progress

#### Data Available

✅ User watchlists and ratings
✅ Social features (followers, comments)
✅ Watch history tracking
✅ Trending content
✅ Popular lists
✅ Recommendations

❌ No streaming availability
❌ Metadata less comprehensive than TMDB
❌ Focused on user tracking, not discovery

#### Strengths

✅ Excellent for user profile integration
✅ Social features built-in
✅ Free API with good rate limits
✅ Active community
✅ Scrobbling integration (track viewing)

#### Use Case for Meta-Media-Search

**User Profile & Social Features:**

- Import user watchlists
- Track viewing history
- Social recommendations
- "Friends are watching" feature

#### Pricing

**Free** with OAuth user authentication

---

## Supplementary Data Sources

### 6. YouTube Data API

**Use Case:** Trailers, clips, behind-the-scenes content

**Integration:**

- Fetch trailers for each title
- Embed preview players
- Link to full videos

**Pricing:** Free (10,000 quota units/day)

---

### 7. Wikipedia API

**Use Case:** Director/actor biographies, plot summaries, trivia

**Integration:**

- Enhanced detail pages
- Context for relationships
- Educational content

**Pricing:** Free (rate limit: 200 requests/second)

---

### 8. Rotten Tomatoes (No Official API)

**Use Case:** Critic and audience scores

**Options:**

- Via OMDb API (includes RT scores)
- Web scraping (not recommended)
- Manual curation for top titles

---

## Data Architecture Recommendations

### Primary Architecture

```
┌─────────────────────────────────────────┐
│         Meta-Media-Search App           │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Aggregation Layer (Our API)     │
│  - Caching (Redis)                      │
│  - Data Normalization                   │
│  - ID Mapping                           │
│  - Rate Limiting                        │
└─────────────────────────────────────────┘
        ↓              ↓              ↓
┌───────────┐   ┌──────────┐   ┌──────────┐
│   TMDB    │   │JustWatch │   │Watchmode │
│   API     │   │   API    │   │   API    │
│  (Free)   │   │(Partner) │   │  (Paid)  │
└───────────┘   └──────────┘   └──────────┘
```

### Database Schema

**Content Table (PostgreSQL)**

```sql
CREATE TABLE content (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER UNIQUE,
  imdb_id VARCHAR(20),
  watchmode_id INTEGER,
  title VARCHAR(500),
  year INTEGER,
  content_type VARCHAR(20), -- movie, series
  plot TEXT,
  runtime INTEGER,
  rating DECIMAL(3,1),
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT[], -- array
  themes TEXT[], -- array
  mood_tags TEXT[], -- array
  embedding VECTOR(1536), -- for semantic search
  metadata JSONB, -- flexible additional data
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_content_tmdb ON content(tmdb_id);
CREATE INDEX idx_content_embedding ON content USING ivfflat (embedding);
CREATE INDEX idx_content_genres ON content USING GIN(genres);
```

**Availability Table (PostgreSQL)**

```sql
CREATE TABLE streaming_availability (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content(id),
  service_name VARCHAR(100),
  country_code VARCHAR(2),
  availability_type VARCHAR(20), -- stream, rent, buy
  quality VARCHAR(10), -- SD, HD, 4K
  price DECIMAL(10,2),
  url TEXT,
  last_checked TIMESTAMP,
  UNIQUE(content_id, service_name, country_code)
);

CREATE INDEX idx_availability_content ON streaming_availability(content_id);
CREATE INDEX idx_availability_service ON streaming_availability(service_name);
```

**Relationships Table (Neo4j)**

```cypher
// Nodes
(:Content {tmdb_id, title, type})
(:Person {name, tmdb_id, role})
(:Genre {name})
(:Theme {name})
(:Service {name})

// Relationships
(:Content)-[:ACTED_IN {character}]->(:Person)
(:Content)-[:DIRECTED_BY]->(:Person)
(:Content)-[:HAS_GENRE]->(:Genre)
(:Content)-[:HAS_THEME {strength}]->(:Theme)
(:Content)-[:AVAILABLE_ON {region, price}]->(:Service)
(:Content)-[:SIMILAR_TO {score, reason}]->(:Content)
```

---

## Data Freshness Strategy

### Real-Time Data (< 1 hour stale)

- New releases and trending content
- User-specific queries (first-time lookups)
- Streaming availability for popular titles

### Daily Sync (24 hour stale acceptable)

- Metadata updates (cast changes, plot updates)
- Popularity rankings
- Streaming availability for long-tail content

### Weekly Sync (7 day stale acceptable)

- Images (posters, backdrops)
- Historical data
- Less popular content metadata

### On-Demand (User-triggered)

- Rarely-searched niche content
- User watchlist imports
- Specific title deep-dives

---

## Caching Strategy

### Multi-Layer Cache

**Layer 1: CDN (Cloudflare)**

- Static assets (images, CSS, JS)
- API responses for popular queries
- TTL: 24 hours

**Layer 2: Redis**

- API responses from external sources
- Computed recommendations
- Graph query results
- TTL: 1-24 hours depending on data type

**Layer 3: PostgreSQL**

- Persistent storage for all content
- Processed and normalized data
- Historical records

**Layer 4: Neo4j**

- Relationship graph
- Pre-computed similarities
- Graph algorithm results

### Cache Invalidation

- **Time-based:** TTL for each data type
- **Event-based:** Webhooks from TMDB (if available)
- **Manual:** Admin dashboard to force refresh
- **Predictive:** Pre-fetch popular content before cache expires

---

## Cost Projections

### MVP Phase (Months 1-6)

- **TMDB API:** Free
- **Watchmode API:** $99/month = $594
- **OpenAI Embeddings:** $200/month = $1,200
- **Infrastructure (Hosting):** $100/month = $600
- **CDN (Images):** $50/month = $300
- **Total:** ~$2,700 for 6 months

### Growth Phase (10k-100k users)

- **TMDB API:** Free
- **JustWatch Partnership:** $500-1000/month (estimated)
- **Watchmode API:** $499/month
- **OpenAI API:** $500/month
- **Infrastructure:** $300/month
- **CDN:** $150/month
- **Total:** ~$2,000-2,500/month

### Scale Phase (100k+ users)

- **APIs:** $1,500/month
- **Infrastructure:** $1,000/month
- **CDN:** $500/month
- **AI/ML:** $1,000/month
- **Total:** ~$4,000/month

---

## Legal & Compliance

### Attribution Requirements

**TMDB:**

- Logo and link required on all pages using data
- "This product uses the TMDB API but is not endorsed or certified by TMDB"
- Logo specifications: https://www.themoviedb.org/about/logos-attribution

**JustWatch:**

- "Streaming data provided by JustWatch"
- JustWatch logo with link
- Prominently displayed
- Non-compliance = API access revocation

### Data Usage Rights

- **Fair Use:** Metadata for discovery purposes (generally acceptable)
- **No Hosting:** Don't host copyrighted images (link to official sources)
- **No Scraping:** Use official APIs only
- **User Data:** GDPR compliance for EU users, CCPA for California

### Terms of Service Compliance

- Read and comply with all API provider ToS
- Respect rate limits
- Proper attribution
- Don't resell raw data
- Use for discovery/information purposes only

---

## Risk Mitigation

### API Dependency Risks

**Risk:** TMDB API changes or goes down
**Mitigation:**

- Cache extensively
- OMDb API as backup for metadata
- Database as fallback

**Risk:** JustWatch partnership denied
**Mitigation:**

- Watchmode API as primary alternative
- User-reported availability as supplementary
- Direct partnerships with individual services

**Risk:** Rate limits exceeded
**Mitigation:**

- Aggressive caching
- Request queuing and throttling
- Upgrade to paid tiers if needed
- Load balancing across API keys

### Data Quality Risks

**Risk:** Inconsistent or incorrect data
**Mitigation:**

- Data validation pipelines
- User reporting for corrections
- Cross-reference multiple sources
- Manual curation for popular titles

---

## Recommended Implementation Order

### Phase 1: MVP Core (Weeks 1-4)

1. Set up TMDB API integration
2. Import top 50k movies and shows
3. Basic metadata storage in PostgreSQL
4. Simple availability via TMDB watch providers

### Phase 2: Enhanced Data (Weeks 5-8)

1. Integrate Watchmode API for better availability
2. Add Trakt.tv for user features
3. YouTube API for trailers
4. Neo4j graph for relationships

### Phase 3: AI/ML Layer (Weeks 9-12)

1. Generate embeddings for all content
2. Semantic search with vector database
3. LLM integration for query understanding
4. Recommendation engine v1

### Phase 4: Optimization (Weeks 13-16)

1. Advanced caching strategies
2. Performance tuning
3. Data freshness automation
4. Monitoring and alerting

---

## Summary & Recommendations

### Primary Data Stack (Recommended)

**✅ TMDB API** - Free, comprehensive metadata (PRIMARY)
**✅ Watchmode API** - $99/month, reliable streaming data (MVP)
**✅ OpenAI Embeddings API** - $200/month, semantic search (CORE)
**✅ Trakt.tv API** - Free, user profiles and social (NICE-TO-HAVE)

**Total MVP Cost:** ~$400/month plus infrastructure

### Future Enhancements

**🎯 JustWatch Partnership** - Best streaming data (apply after MVP)
**🎯 Custom ML Models** - Reduce OpenAI costs at scale
**🎯 Direct Service APIs** - Netflix, Disney+, etc. (if available)

### Success Metrics to Track

- API response times (< 200ms target)
- Cache hit rates (> 80% target)
- Data freshness (< 24h stale for 90% of queries)
- API costs per user (< $0.10 target)
- Data accuracy (> 95% via user feedback)

---

**Document End**
