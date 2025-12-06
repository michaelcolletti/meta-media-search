//! High-performance vector similarity search implementation
//!
//! Provides efficient algorithms for finding similar vectors using various distance metrics.

use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;

/// Distance metrics for vector similarity
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DistanceMetric {
    /// Cosine similarity (normalized dot product)
    Cosine,
    /// Euclidean distance (L2 norm)
    Euclidean,
    /// Manhattan distance (L1 norm)
    Manhattan,
    /// Dot product (unnormalized)
    DotProduct,
}

/// Search result containing vector ID and similarity score
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// Index of the vector in the database
    pub id: usize,
    /// Similarity score (higher is more similar for cosine/dot, lower for distance metrics)
    pub score: f32,
}

#[wasm_bindgen]
impl SearchResult {
    #[wasm_bindgen(constructor)]
    pub fn new(id: usize, score: f32) -> Self {
        SearchResult { id, score }
    }

    #[wasm_bindgen(getter)]
    pub fn id(&self) -> usize {
        self.id
    }

    #[wasm_bindgen(getter)]
    pub fn score(&self) -> f32 {
        self.score
    }
}

/// High-performance vector index for similarity search
#[wasm_bindgen]
pub struct VectorIndex {
    vectors: Vec<Vec<f32>>,
    dimension: usize,
    metric: DistanceMetric,
    normalized: bool,
}

#[wasm_bindgen]
impl VectorIndex {
    /// Create a new vector index
    #[wasm_bindgen(constructor)]
    pub fn new(dimension: usize, metric: DistanceMetric) -> Self {
        VectorIndex {
            vectors: Vec::new(),
            dimension,
            metric,
            normalized: false,
        }
    }

    /// Add a vector to the index
    pub fn add_vector(&mut self, vector: &[f32]) -> Result<usize, JsValue> {
        if vector.len() != self.dimension {
            return Err(JsValue::from_str(&format!(
                "Vector dimension mismatch: expected {}, got {}",
                self.dimension,
                vector.len()
            )));
        }

        let mut vec = vector.to_vec();

        // Normalize if using cosine similarity
        if self.metric == DistanceMetric::Cosine {
            normalize_vector(&mut vec);
        }

        self.vectors.push(vec);
        Ok(self.vectors.len() - 1)
    }

    /// Add multiple vectors in batch
    pub fn add_vectors_batch(&mut self, vectors: &[f32], count: usize) -> Result<(), JsValue> {
        if vectors.len() != count * self.dimension {
            return Err(JsValue::from_str(&format!(
                "Invalid batch size: expected {} floats, got {}",
                count * self.dimension,
                vectors.len()
            )));
        }

        for i in 0..count {
            let start = i * self.dimension;
            let end = start + self.dimension;
            let slice = &vectors[start..end];
            self.add_vector(slice)?;
        }

        Ok(())
    }

    /// Search for k nearest neighbors
    pub fn search(&self, query: &[f32], k: usize) -> Result<Vec<SearchResult>, JsValue> {
        if query.len() != self.dimension {
            return Err(JsValue::from_str(&format!(
                "Query dimension mismatch: expected {}, got {}",
                self.dimension,
                query.len()
            )));
        }

        if self.vectors.is_empty() {
            return Ok(Vec::new());
        }

        let mut query_vec = query.to_vec();
        if self.metric == DistanceMetric::Cosine {
            normalize_vector(&mut query_vec);
        }

        let mut results: Vec<SearchResult> = self.vectors
            .iter()
            .enumerate()
            .map(|(id, vec)| {
                let score = self.compute_similarity(&query_vec, vec);
                SearchResult { id, score }
            })
            .collect();

        // Sort by score (descending for similarity, ascending for distance)
        let reverse = matches!(self.metric, DistanceMetric::Cosine | DistanceMetric::DotProduct);
        results.sort_by(|a, b| {
            if reverse {
                b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal)
            } else {
                a.score.partial_cmp(&b.score).unwrap_or(Ordering::Equal)
            }
        });

        // Return top k results
        results.truncate(k.min(results.len()));
        Ok(results)
    }

    /// Get the number of vectors in the index
    pub fn size(&self) -> usize {
        self.vectors.len()
    }

    /// Get the dimension of vectors
    pub fn dimension(&self) -> usize {
        self.dimension
    }

    /// Clear all vectors from the index
    pub fn clear(&mut self) {
        self.vectors.clear();
    }

    /// Get a vector by ID
    pub fn get_vector(&self, id: usize) -> Option<Vec<f32>> {
        self.vectors.get(id).cloned()
    }
}

impl VectorIndex {
    /// Compute similarity/distance between two vectors based on the metric
    fn compute_similarity(&self, a: &[f32], b: &[f32]) -> f32 {
        match self.metric {
            DistanceMetric::Cosine => cosine_similarity(a, b),
            DistanceMetric::Euclidean => euclidean_distance(a, b),
            DistanceMetric::Manhattan => manhattan_distance(a, b),
            DistanceMetric::DotProduct => dot_product(a, b),
        }
    }
}

/// Compute cosine similarity between two vectors (assumes normalized)
#[inline]
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    dot_product(a, b)
}

/// Compute dot product of two vectors
#[inline]
pub fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

/// Compute Euclidean distance between two vectors
#[inline]
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    a.iter()
        .zip(b.iter())
        .map(|(x, y)| {
            let diff = x - y;
            diff * diff
        })
        .sum::<f32>()
        .sqrt()
}

/// Compute Manhattan distance between two vectors
#[inline]
pub fn manhattan_distance(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| (x - y).abs()).sum()
}

/// Normalize a vector to unit length
pub fn normalize_vector(vec: &mut [f32]) {
    let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 0.0 {
        for x in vec.iter_mut() {
            *x /= norm;
        }
    }
}

/// Batch normalize multiple vectors
pub fn normalize_vectors_batch(vectors: &mut [f32], dimension: usize) {
    let count = vectors.len() / dimension;
    for i in 0..count {
        let start = i * dimension;
        let end = start + dimension;
        normalize_vector(&mut vectors[start..end]);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert!((cosine_similarity(&a, &b) - 1.0).abs() < 1e-6);

        let c = vec![0.0, 1.0, 0.0];
        assert!(cosine_similarity(&a, &c).abs() < 1e-6);
    }

    #[test]
    fn test_euclidean_distance() {
        let a = vec![0.0, 0.0, 0.0];
        let b = vec![1.0, 1.0, 1.0];
        let dist = euclidean_distance(&a, &b);
        assert!((dist - 3.0_f32.sqrt()).abs() < 1e-6);
    }

    #[test]
    fn test_normalize() {
        let mut vec = vec![3.0, 4.0, 0.0];
        normalize_vector(&mut vec);
        let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_vector_index() {
        let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

        index.add_vector(&[1.0, 0.0, 0.0]).unwrap();
        index.add_vector(&[0.0, 1.0, 0.0]).unwrap();
        index.add_vector(&[0.9, 0.1, 0.0]).unwrap();

        let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].id, 0);
    }
}
