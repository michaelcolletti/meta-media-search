# Meta-Media-Search API Documentation

## Overview

The Meta-Media-Search API provides AI-powered natural language search and personalized recommendations for movies, TV shows, and other media content across multiple streaming platforms.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints support optional authentication. Authenticated requests receive personalized results.

### Authentication Header

```
Authorization: Bearer <your_jwt_token>
```

### Getting a Token

Register or login to receive a JWT token:

```bash
# Register
POST /api/v1/user/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}

# Login
POST /api/v1/user/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

## Core Endpoints

### 1. Search

#### Natural Language Search

Search for media using natural language queries. The AI will interpret your query and extract relevant filters.

```bash
GET /api/v1/search?q=action movies from the 90s with good ratings
```

**Query Parameters:**

- `q` (required): Search query string
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "tmdb_movie_603",
        "title": "The Matrix",
        "type": "movie",
        "description": "A computer hacker learns...",
        "genres": ["Action", "Science Fiction"],
        "releaseDate": "1999-03-30",
        "rating": 8.7,
        "thumbnail": "https://...",
        "posterUrl": "https://...",
        "platforms": [
          {
            "id": "netflix",
            "name": "Netflix",
            "type": "streaming",
            "available": true
          }
        ],
        "cast": [...],
        "director": "Lana Wachowski"
      }
    ],
    "total": 47,
    "query": "action movies from the 90s with good ratings",
    "processingTime": 234,
    "suggestions": [
      "Action movies",
      "Sci-fi movies from 1990s"
    ],
    "visualMap": [...]
  }
}
```

#### Advanced Search with Filters

```bash
POST /api/v1/search
Content-Type: application/json

{
  "query": "sci-fi movies",
  "filters": {
    "type": ["movie"],
    "genres": ["Science Fiction", "Action"],
    "platforms": ["netflix", "hulu"],
    "minRating": 7.0,
    "releaseYearMin": 2010,
    "releaseYearMax": 2024,
    "language": "en"
  },
  "limit": 20,
  "offset": 0
}
```

### 2. Discover

Get trending content or personalized discovery based on user preferences.

```bash
GET /api/v1/search/discover?limit=20
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 20
  }
}
```

### 3. Recommendations

Get personalized recommendations (requires authentication).

```bash
GET /api/v1/recommendations?limit=10
Authorization: Bearer <token>
```

**Advanced Recommendations:**

```bash
POST /api/v1/recommendations
Authorization: Bearer <token>
Content-Type: application/json

{
  "basedOn": ["movie_id_1", "movie_id_2"],
  "limit": 10,
  "diversityFactor": 0.3
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [...],
    "reasoning": "Based on your preference for action and sci-fi genres...",
    "confidence": 0.87,
    "factors": {
      "genreMatch": 0.85,
      "platformAvailability": 0.90,
      "ratingAlignment": 0.88,
      "contentSimilarity": 0.82
    }
  }
}
```

### 4. User Management

#### Register

```bash
POST /api/v1/user/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

#### Login

```bash
POST /api/v1/user/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Get Profile

```bash
GET /api/v1/user/profile
Authorization: Bearer <token>
```

#### Update Preferences

```bash
PUT /api/v1/user/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "genres": ["Action", "Sci-Fi", "Thriller"],
  "platforms": ["netflix", "hulu", "disney-plus"],
  "contentTypes": ["movie", "tv"],
  "languages": ["en"],
  "minRating": 7.0,
  "excludeMature": false
}
```

#### Toggle Favorite

```bash
POST /api/v1/user/favorites/:mediaId
Authorization: Bearer <token>
```

#### Get Favorites

```bash
GET /api/v1/user/favorites
Authorization: Bearer <token>
```

#### Get Watch History

```bash
GET /api/v1/user/history
Authorization: Bearer <token>
```

### 5. Platforms

#### List All Platforms

```bash
GET /api/v1/platforms
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "netflix",
      "name": "Netflix",
      "type": "streaming",
      "logo": "https://..."
    },
    {
      "id": "hulu",
      "name": "Hulu",
      "type": "streaming",
      "logo": "https://..."
    }
  ]
}
```

#### Get Platform Details

```bash
GET /api/v1/platforms/:id
```

## Rate Limiting

Rate limits are applied per IP address:

- **Search endpoints**: 30 requests per minute
- **Recommendation endpoints**: 20 requests per minute
- **Authentication endpoints**: 5 requests per 15 minutes

When rate limited, the API returns a `429 Too Many Requests` status.

## Error Responses

All errors follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "statusCode": 400,
  "details": {
    // Optional additional error details
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Invalid request data
- `AUTHENTICATION_ERROR` (401): Missing or invalid authentication
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_ERROR` (429): Too many requests
- `EXTERNAL_API_ERROR` (502): External service error
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error

## Visual Map Data

The visual map provides a spatial representation of search results with connections between related content.

```json
{
  "visualMap": [
    {
      "id": "movie_123",
      "title": "The Matrix",
      "type": "movie",
      "thumbnail": "https://...",
      "relevanceScore": 0.95,
      "position": {
        "x": 45.2,
        "y": -23.8
      },
      "connections": ["movie_456", "movie_789"],
      "metadata": {
        "genres": ["Action", "Sci-Fi"],
        "rating": 8.7,
        "year": 1999
      }
    }
  ]
}
```

## Examples

### Example 1: Find Movies on Netflix

```bash
curl -X GET "http://localhost:3000/api/v1/search?q=best movies on netflix"
```

### Example 2: Search with Filters

```bash
curl -X POST "http://localhost:3000/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "superhero movies",
    "filters": {
      "minRating": 8.0,
      "releaseYearMin": 2020
    }
  }'
```

### Example 3: Get Personalized Recommendations

```bash
curl -X GET "http://localhost:3000/api/v1/recommendations?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Update User Preferences

```bash
curl -X PUT "http://localhost:3000/api/v1/user/preferences" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "genres": ["Action", "Thriller"],
    "platforms": ["netflix", "hulu"],
    "minRating": 7.5
  }'
```

## Best Practices

1. **Use Natural Language**: The search endpoint is optimized for natural language queries
2. **Cache Results**: Responses are cached for 30 minutes
3. **Authenticate**: Get personalized results by including an auth token
4. **Handle Rate Limits**: Implement exponential backoff for rate limit errors
5. **Update Preferences**: Keep user preferences updated for better recommendations

## SDK Examples

### JavaScript/TypeScript

```typescript
const API_BASE = 'http://localhost:3000/api/v1';

async function search(query: string, token?: string) {
  const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  return response.json();
}

async function getRecommendations(token: string) {
  const response = await fetch(`${API_BASE}/recommendations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.json();
}
```

### Python

```python
import requests

API_BASE = 'http://localhost:3000/api/v1'

def search(query, token=None):
    headers = {'Authorization': f'Bearer {token}'} if token else {}
    response = requests.get(
        f'{API_BASE}/search',
        params={'q': query},
        headers=headers
    )
    return response.json()

def get_recommendations(token):
    response = requests.get(
        f'{API_BASE}/recommendations',
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()
```

## Support

For issues or questions:

- GitHub Issues: [github.com/yourusername/meta-media-search/issues]
- Email: support@metamediasearch.com
