use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use web_sys::{console, Performance, Window};
use js_sys::{Array, Date, Object, Reflect};

// Mobile-optimized core module
// Bundle target: < 500KB compressed
// Performance: < 2s initial load on 3G

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
    log("Mobile WASM Core initialized");
}

/// Media item structure optimized for mobile
#[derive(Serialize, Deserialize, Clone, Debug)]
#[wasm_bindgen]
pub struct MediaItem {
    id: String,
    title: String,
    media_type: String,
    platform: String,
    score: f32,
    thumbnail_url: Option<String>,
    cached: bool,
}

#[wasm_bindgen]
impl MediaItem {
    #[wasm_bindgen(constructor)]
    pub fn new(
        id: String,
        title: String,
        media_type: String,
        platform: String,
        score: f32,
    ) -> MediaItem {
        MediaItem {
            id,
            title,
            media_type,
            platform,
            score,
            thumbnail_url: None,
            cached: false,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn title(&self) -> String {
        self.title.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn score(&self) -> f32 {
        self.score
    }
}

/// Search cache with LRU eviction
#[wasm_bindgen]
pub struct SearchCache {
    max_size: usize,
    cache: Vec<(String, String, f64)>, // (query, results_json, timestamp)
}

#[wasm_bindgen]
impl SearchCache {
    #[wasm_bindgen(constructor)]
    pub fn new(max_size: usize) -> SearchCache {
        SearchCache {
            max_size,
            cache: Vec::with_capacity(max_size),
        }
    }

    /// Get cached search results
    #[wasm_bindgen]
    pub fn get(&self, query: &str) -> Option<String> {
        for (cached_query, results, _) in &self.cache {
            if cached_query == query {
                return Some(results.clone());
            }
        }
        None
    }

    /// Cache search results with timestamp
    #[wasm_bindgen]
    pub fn set(&mut self, query: String, results: String) {
        let timestamp = Date::now();

        // Remove existing entry if present
        self.cache.retain(|(q, _, _)| q != &query);

        // Add new entry
        self.cache.push((query, results, timestamp));

        // Evict oldest if over capacity
        if self.cache.len() > self.max_size {
            self.cache.sort_by(|a, b| a.2.partial_cmp(&b.2).unwrap());
            self.cache.remove(0);
        }
    }

    /// Clear all cached entries
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.cache.clear();
    }

    /// Get cache statistics
    #[wasm_bindgen]
    pub fn stats(&self) -> JsValue {
        let obj = Object::new();
        Reflect::set(&obj, &"size".into(), &JsValue::from(self.cache.len())).unwrap();
        Reflect::set(&obj, &"maxSize".into(), &JsValue::from(self.max_size)).unwrap();
        obj.into()
    }
}

/// Text search and ranking engine
#[wasm_bindgen]
pub struct SearchEngine {
    cache: SearchCache,
}

#[wasm_bindgen]
impl SearchEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(cache_size: usize) -> SearchEngine {
        SearchEngine {
            cache: SearchCache::new(cache_size),
        }
    }

    /// Compute text similarity using optimized algorithm
    pub fn compute_similarity(&self, query: &str, text: &str) -> f32 {
        let query_lower = query.to_lowercase();
        let text_lower = text.to_lowercase();

        // Exact match bonus
        if text_lower.contains(&query_lower) {
            return 1.0;
        }

        // Word-level matching
        let query_words: Vec<&str> = query_lower.split_whitespace().collect();
        let text_words: Vec<&str> = text_lower.split_whitespace().collect();

        let mut matches = 0;
        for q_word in &query_words {
            for t_word in &text_words {
                if t_word.contains(q_word) {
                    matches += 1;
                    break;
                }
            }
        }

        matches as f32 / query_words.len() as f32
    }

    /// Filter and rank search results
    #[wasm_bindgen]
    pub fn search(&mut self, query: &str, items_json: &str) -> Result<String, JsValue> {
        // Check cache first
        if let Some(cached) = self.cache.get(query) {
            return Ok(cached);
        }

        // Parse input
        let items: Vec<MediaItem> = serde_json::from_str(items_json)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        // Score and filter
        let mut scored: Vec<(f32, MediaItem)> = items
            .into_iter()
            .map(|item| {
                let title_score = self.compute_similarity(query, &item.title);
                let total_score = title_score * item.score;
                (total_score, item)
            })
            .filter(|(score, _)| *score > 0.1)
            .collect();

        // Sort by score descending
        scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());

        // Take top results
        let results: Vec<MediaItem> = scored
            .into_iter()
            .take(50)
            .map(|(_, item)| item)
            .collect();

        // Serialize and cache
        let results_json = serde_json::to_string(&results)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        self.cache.set(query.to_string(), results_json.clone());

        Ok(results_json)
    }

    /// Clear search cache
    #[wasm_bindgen]
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    /// Get cache statistics
    #[wasm_bindgen]
    pub fn cache_stats(&self) -> JsValue {
        self.cache.stats()
    }
}

/// Performance monitoring utilities
#[wasm_bindgen]
pub struct PerformanceMonitor {
    marks: Vec<(String, f64)>,
}

#[wasm_bindgen]
impl PerformanceMonitor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PerformanceMonitor {
        PerformanceMonitor {
            marks: Vec::new(),
        }
    }

    /// Mark a performance checkpoint
    #[wasm_bindgen]
    pub fn mark(&mut self, name: String) {
        let window = web_sys::window().expect("no global window");
        let performance = window.performance().expect("no performance");
        let now = performance.now();
        self.marks.push((name.clone(), now));

        // Also create browser performance mark
        performance.mark(&name).ok();
    }

    /// Measure time between two marks
    #[wasm_bindgen]
    pub fn measure(&self, name: &str, start_mark: &str, end_mark: &str) -> Result<f64, JsValue> {
        let window = web_sys::window().ok_or("no global window")?;
        let performance = window.performance().ok_or("no performance")?;

        performance
            .measure_with_start_mark_and_end_mark(name, start_mark, end_mark)
            .map_err(|e| JsValue::from_str(&format!("{:?}", e)))?;

        let start = self.marks.iter().find(|(n, _)| n == start_mark);
        let end = self.marks.iter().find(|(n, _)| n == end_mark);

        match (start, end) {
            (Some((_, start_time)), Some((_, end_time))) => Ok(end_time - start_time),
            _ => Err(JsValue::from_str("Mark not found")),
        }
    }

    /// Get all marks
    #[wasm_bindgen]
    pub fn get_marks(&self) -> JsValue {
        let array = Array::new();
        for (name, time) in &self.marks {
            let obj = Object::new();
            Reflect::set(&obj, &"name".into(), &JsValue::from_str(name)).unwrap();
            Reflect::set(&obj, &"time".into(), &JsValue::from_f64(*time)).unwrap();
            array.push(&obj);
        }
        array.into()
    }

    /// Clear all marks
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.marks.clear();
        if let Some(window) = web_sys::window() {
            if let Some(performance) = window.performance() {
                performance.clear_marks();
            }
        }
    }
}

/// Data compression utilities for bandwidth optimization
#[wasm_bindgen]
pub struct DataCompressor;

#[wasm_bindgen]
impl DataCompressor {
    /// Compress JSON data for storage/transmission
    #[wasm_bindgen]
    pub fn compress(data: &str) -> Result<Vec<u8>, JsValue> {
        let bytes = data.as_bytes();
        lz4::block::compress(bytes, None, false)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Decompress data
    #[wasm_bindgen]
    pub fn decompress(data: &[u8], original_size: i32) -> Result<String, JsValue> {
        let decompressed = lz4::block::decompress(data, Some(original_size))
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        String::from_utf8(decompressed)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_similarity_exact_match() {
        let engine = SearchEngine::new(10);
        let score = engine.compute_similarity("test", "this is a test");
        assert!(score > 0.9);
    }

    #[test]
    fn test_similarity_partial_match() {
        let engine = SearchEngine::new(10);
        let score = engine.compute_similarity("movie action", "action movies");
        assert!(score > 0.5);
    }

    #[test]
    fn test_cache_operations() {
        let mut cache = SearchCache::new(2);
        cache.set("query1".to_string(), "results1".to_string());

        assert_eq!(cache.get("query1"), Some("results1".to_string()));
        assert_eq!(cache.get("query2"), None);
    }
}
