//! WebAssembly vector operations for high-performance media search
//!
//! This module provides optimized vector operations for:
//! - Cosine similarity calculations
//! - K-nearest neighbors search
//! - Vector normalization
//! - Batch processing

use wasm_bindgen::prelude::*;
use ndarray::{Array1, Array2};
use serde::{Deserialize, Serialize};

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Vector search result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen]
pub struct SearchResult {
    pub index: usize,
    pub similarity: f32,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(constructor)]
    pub fn new(index: usize, similarity: f32) -> Self {
        Self { index, similarity }
    }
}

/// Calculate cosine similarity between two vectors
#[wasm_bindgen]
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> Result<f32, JsValue> {
    if a.len() != b.len() {
        return Err(JsValue::from_str("Vectors must have equal length"));
    }

    let a_arr = Array1::from_vec(a.to_vec());
    let b_arr = Array1::from_vec(b.to_vec());

    let dot = a_arr.dot(&b_arr);
    let norm_a = a_arr.dot(&a_arr).sqrt();
    let norm_b = b_arr.dot(&b_arr).sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return Ok(0.0);
    }

    Ok(dot / (norm_a * norm_b))
}

/// Normalize a vector to unit length
#[wasm_bindgen]
pub fn normalize_vector(vec: &[f32]) -> Vec<f32> {
    let arr = Array1::from_vec(vec.to_vec());
    let norm = arr.dot(&arr).sqrt();

    if norm == 0.0 {
        return vec.to_vec();
    }

    (arr / norm).to_vec()
}

/// Find K nearest neighbors using cosine similarity
#[wasm_bindgen]
pub fn knn_search(
    query: &[f32],
    vectors: &[f32],
    vector_dim: usize,
    k: usize,
) -> Result<Vec<JsValue>, JsValue> {
    if vectors.len() % vector_dim != 0 {
        return Err(JsValue::from_str("Invalid vector dimensions"));
    }

    let num_vectors = vectors.len() / vector_dim;
    let mut similarities: Vec<SearchResult> = Vec::with_capacity(num_vectors);

    // Calculate similarities for all vectors
    for i in 0..num_vectors {
        let start = i * vector_dim;
        let end = start + vector_dim;
        let vec = &vectors[start..end];

        let sim = cosine_similarity(query, vec)?;
        similarities.push(SearchResult::new(i, sim));
    }

    // Sort by similarity (descending)
    similarities.sort_by(|a, b| b.similarity.partial_cmp(&a.similarity).unwrap());

    // Return top K results
    let top_k = similarities.iter()
        .take(k.min(num_vectors))
        .map(|r| JsValue::from_serde(r).unwrap())
        .collect();

    Ok(top_k)
}

/// Batch cosine similarity calculation
#[wasm_bindgen]
pub fn batch_cosine_similarity(
    query: &[f32],
    vectors: &[f32],
    vector_dim: usize,
) -> Result<Vec<f32>, JsValue> {
    if vectors.len() % vector_dim != 0 {
        return Err(JsValue::from_str("Invalid vector dimensions"));
    }

    let num_vectors = vectors.len() / vector_dim;
    let mut results = Vec::with_capacity(num_vectors);

    for i in 0..num_vectors {
        let start = i * vector_dim;
        let end = start + vector_dim;
        let vec = &vectors[start..end];

        let sim = cosine_similarity(query, vec)?;
        results.push(sim);
    }

    Ok(results)
}

/// Calculate vector magnitude
#[wasm_bindgen]
pub fn vector_magnitude(vec: &[f32]) -> f32 {
    let arr = Array1::from_vec(vec.to_vec());
    arr.dot(&arr).sqrt()
}

/// Dot product of two vectors
#[wasm_bindgen]
pub fn dot_product(a: &[f32], b: &[f32]) -> Result<f32, JsValue> {
    if a.len() != b.len() {
        return Err(JsValue::from_str("Vectors must have equal length"));
    }

    let a_arr = Array1::from_vec(a.to_vec());
    let b_arr = Array1::from_vec(b.to_vec());

    Ok(a_arr.dot(&b_arr))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0, 3.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert!((result - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert!((result - 0.0).abs() < 1e-6);
    }

    #[test]
    fn test_normalize_vector() {
        let vec = vec![3.0, 4.0];
        let normalized = normalize_vector(&vec);
        let magnitude = vector_magnitude(&normalized);
        assert!((magnitude - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_dot_product() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let result = dot_product(&a, &b).unwrap();
        assert_eq!(result, 32.0);
    }
}
