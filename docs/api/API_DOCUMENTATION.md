# Meta-Media-Search API Documentation

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "meta-media-search",
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

---

### Natural Language Search
```http
POST /api/search
```

Search for media content using natural language queries.

**Request Body:**
```json
{
  "query": "funny sci-fi movies like The Martian",
  "filters": {
    "platforms": ["Netflix", "Hulu"],
    "yearRange": { "min": 2010, "max": 2024 }
  },
  "userPreferences": {
    "favoriteGenres": ["sci-fi", "comedy"],
    "dislikedGenres": ["horror"]
  }
}
```

**Response:**
```json
{
  "query": {
    "original": "funny sci-fi movies like The Martian",
    "processed": {
      "intent": "find_similar",
      "entities": {
        "genres": ["sci-fi", "comedy"],
        "similarTo": ["The Martian"],
        "mood": "funny"
      }
    }
  },
  "results": {
    "total": 15,
    "items": [
      {
        "id": "tmdb-123",
        "title": "Guardians of the Galaxy",
        "type": "movie",
        "genres": ["sci-fi", "comedy", "action"],
        "platforms": ["Disney+"],
        "rating": 8.0,
        "year": 2014,
        "description": "...",
        "imageUrl": "https://..."
      }
    ]
  },
  "visualMap": {
    "nodes": [...],
    "edges": [...]
  },
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

---

### AI-Powered Discovery
```http
POST /api/discover
```

Discover content based on context and mood.

**Request Body:**
```json
{
  "context": {
    "mood": "relaxing",
    "time": "evening",
    "companions": "family",
    "duration": "90-120min"
  },
  "preferences": {
    "favoriteGenres": ["comedy", "animation"],
    "ageRating": "PG-13"
  }
}
```

**Response:**
```json
{
  "discoveries": [...],
  "visualMap": {
    "nodes": [...],
    "edges": [...]
  },
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

---

### Personalized Recommendations
```http
POST /api/recommendations
```

Get personalized content recommendations based on user history.

**Request Body:**
```json
{
  "userId": "user-123",
  "limit": 20
}
```

**Response:**
```json
{
  "recommendations": [...],
  "visualMap": {
    "nodes": [...],
    "edges": [...]
  },
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

---

## Visual Map Data Structure

### Nodes
```json
{
  "id": "tmdb-123",
  "label": "The Martian",
  "type": "movie",
  "x": 234.5,
  "y": -112.3,
  "size": 80,
  "metadata": {
    "title": "The Martian",
    "rating": 8.0,
    "genres": ["sci-fi", "drama"],
    "platforms": ["Netflix"],
    "year": 2015
  }
}
```

### Edges
```json
{
  "source": "tmdb-123",
  "target": "tmdb-456",
  "weight": 0.85,
  "type": "similar"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Query is required and must be a string",
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Search failed",
  "message": "Detailed error message",
  "timestamp": "2025-12-02T10:00:00.000Z"
}
```

---

## Rate Limiting

- 100 requests per 15 minutes per IP
- Rate limit headers included in responses

---

## Authentication

Currently, the API is open for development. Authentication will be added in future versions.
