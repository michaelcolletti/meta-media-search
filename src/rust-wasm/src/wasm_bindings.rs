//! WASM JavaScript bindings and convenience functions
//!
//! Provides ergonomic JavaScript API for the Rust functionality.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::vector_search::{VectorIndex, DistanceMetric, SearchResult};
use crate::embeddings::{EmbeddingGenerator, EmbeddingConfig};

/// JavaScript-friendly search results
#[wasm_bindgen]
#[derive(Serialize, Deserialize)]
pub struct SearchResults {
    results: Vec<SearchResult>,
    query_time_ms: f64,
}

#[wasm_bindgen]
impl SearchResults {
    /// Get results as JSON string
    pub fn to_json(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.results)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Get query execution time in milliseconds
    pub fn query_time(&self) -> f64 {
        self.query_time_ms
    }

    /// Get number of results
    pub fn count(&self) -> usize {
        self.results.len()
    }

    /// Get result at index
    pub fn get(&self, index: usize) -> Option<SearchResult> {
        self.results.get(index).cloned()
    }
}

/// High-level API for vector search with performance tracking
#[wasm_bindgen]
pub struct VectorSearchEngine {
    index: VectorIndex,
}

#[wasm_bindgen]
impl VectorSearchEngine {
    /// Create a new search engine
    #[wasm_bindgen(constructor)]
    pub fn new(dimension: usize, metric_str: &str) -> Result<VectorSearchEngine, JsValue> {
        let metric = match metric_str.to_lowercase().as_str() {
            "cosine" => DistanceMetric::Cosine,
            "euclidean" => DistanceMetric::Euclidean,
            "manhattan" => DistanceMetric::Manhattan,
            "dotproduct" => DistanceMetric::DotProduct,
            _ => return Err(JsValue::from_str("Invalid metric. Use: cosine, euclidean, manhattan, or dotproduct")),
        };

        Ok(VectorSearchEngine {
            index: VectorIndex::new(dimension, metric),
        })
    }

    /// Add a vector from JavaScript array
    pub fn add(&mut self, vector: Vec<f32>) -> Result<usize, JsValue> {
        self.index.add_vector(&vector)
    }

    /// Add multiple vectors in batch
    pub fn add_batch(&mut self, vectors: Vec<f32>, count: usize) -> Result<(), JsValue> {
        self.index.add_vectors_batch(&vectors, count)
    }

    /// Search with performance tracking
    pub fn search(&self, query: Vec<f32>, k: usize) -> Result<SearchResults, JsValue> {
        let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window object"))?;
        let performance = window.performance().ok_or_else(|| JsValue::from_str("No performance API"))?;

        let start = performance.now();
        let results = self.index.search(&query, k)?;
        let query_time_ms = performance.now() - start;

        Ok(SearchResults {
            results,
            query_time_ms,
        })
    }

    /// Get index statistics as JSON
    pub fn stats(&self) -> Result<String, JsValue> {
        let stats = IndexStats {
            size: self.index.size(),
            dimension: self.index.dimension(),
        };
        serde_json::to_string(&stats)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Clear all vectors
    pub fn clear(&mut self) {
        self.index.clear();
    }

    /// Get vector by ID
    pub fn get_vector(&self, id: usize) -> Option<Vec<f32>> {
        self.index.get_vector(id)
    }
}

#[derive(Serialize, Deserialize)]
struct IndexStats {
    size: usize,
    dimension: usize,
}

/// Batch processing utilities
#[wasm_bindgen]
pub struct BatchProcessor {
    dimension: usize,
    batch_size: usize,
}

#[wasm_bindgen]
impl BatchProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(dimension: usize, batch_size: usize) -> Self {
        BatchProcessor {
            dimension,
            batch_size,
        }
    }

    /// Process vectors in batches
    pub fn process(&self, vectors: &[f32], operation: &str) -> Result<Vec<f32>, JsValue> {
        let count = vectors.len() / self.dimension;
        if vectors.len() != count * self.dimension {
            return Err(JsValue::from_str("Invalid vector batch size"));
        }

        match operation {
            "normalize" => {
                let mut result = vectors.to_vec();
                crate::vector_search::normalize_vectors_batch(&mut result, self.dimension);
                Ok(result)
            }
            "centroid" => {
                crate::embeddings::compute_centroid(vectors, self.dimension)
            }
            _ => Err(JsValue::from_str("Unknown operation")),
        }
    }
}

/// Memory-efficient vector storage with compression
#[wasm_bindgen]
pub struct CompressedVectorStore {
    vectors: Vec<u8>,
    dimension: usize,
    count: usize,
    compression_factor: u8,
}

#[wasm_bindgen]
impl CompressedVectorStore {
    #[wasm_bindgen(constructor)]
    pub fn new(dimension: usize, compression_factor: u8) -> Self {
        CompressedVectorStore {
            vectors: Vec::new(),
            dimension,
            count: 0,
            compression_factor: compression_factor.max(1).min(8),
        }
    }

    /// Add a vector with quantization
    pub fn add(&mut self, vector: &[f32]) -> Result<(), JsValue> {
        if vector.len() != self.dimension {
            return Err(JsValue::from_str("Vector dimension mismatch"));
        }

        // Simple quantization to u8
        for &val in vector {
            let quantized = ((val.clamp(-1.0, 1.0) + 1.0) * 127.5) as u8;
            self.vectors.push(quantized);
        }

        self.count += 1;
        Ok(())
    }

    /// Get a vector by ID (dequantized)
    pub fn get(&self, id: usize) -> Result<Vec<f32>, JsValue> {
        if id >= self.count {
            return Err(JsValue::from_str("Index out of bounds"));
        }

        let start = id * self.dimension;
        let end = start + self.dimension;

        let result: Vec<f32> = self.vectors[start..end]
            .iter()
            .map(|&b| (b as f32 / 127.5) - 1.0)
            .collect();

        Ok(result)
    }

    /// Get memory usage in bytes
    pub fn memory_usage(&self) -> usize {
        self.vectors.len()
    }

    pub fn count(&self) -> usize {
        self.count
    }
}

/// Utility functions exported to JavaScript
#[wasm_bindgen]
pub fn cosine_similarity_js(a: &[f32], b: &[f32]) -> Result<f32, JsValue> {
    if a.len() != b.len() {
        return Err(JsValue::from_str("Vectors must have same dimension"));
    }
    Ok(crate::vector_search::cosine_similarity(a, b))
}

#[wasm_bindgen]
pub fn normalize_vector_js(vector: Vec<f32>) -> Vec<f32> {
    let mut result = vector;
    crate::vector_search::normalize_vector(&mut result);
    result
}

#[wasm_bindgen]
pub fn dot_product_js(a: &[f32], b: &[f32]) -> Result<f32, JsValue> {
    if a.len() != b.len() {
        return Err(JsValue::from_str("Vectors must have same dimension"));
    }
    Ok(crate::vector_search::dot_product(a, b))
}

/// Log a message to the browser console
#[wasm_bindgen]
pub fn log(message: &str) {
    web_sys::console::log_1(&JsValue::from_str(message));
}

/// Get performance metrics
#[wasm_bindgen]
pub fn get_performance_metrics() -> Result<String, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window"))?;
    let performance = window.performance().ok_or_else(|| JsValue::from_str("No performance API"))?;

    let metrics = PerformanceMetrics {
        now: performance.now(),
        memory_used: js_sys::eval("performance.memory ? performance.memory.usedJSHeapSize : 0")
            .unwrap_or(JsValue::from_f64(0.0))
            .as_f64()
            .unwrap_or(0.0) as usize,
    };

    serde_json::to_string(&metrics)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

#[derive(Serialize)]
struct PerformanceMetrics {
    now: f64,
    memory_used: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compressed_store() {
        let mut store = CompressedVectorStore::new(3, 8);

        store.add(&[0.5, -0.5, 0.0]).unwrap();
        store.add(&[1.0, 0.0, -1.0]).unwrap();

        assert_eq!(store.count(), 2);
        assert_eq!(store.memory_usage(), 6); // 2 vectors * 3 dims

        let vec = store.get(0).unwrap();
        assert_eq!(vec.len(), 3);
    }
}
