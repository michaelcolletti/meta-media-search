//! Embedding generation and manipulation utilities
//!
//! Provides tools for working with vector embeddings efficiently.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;
use std::collections::HashMap;

/// Configuration for embedding generation
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingConfig {
    dimension: usize,
    normalize: bool,
    pooling_strategy: PoolingStrategy,
}

#[wasm_bindgen]
impl EmbeddingConfig {
    #[wasm_bindgen(constructor)]
    pub fn new(dimension: usize) -> Self {
        EmbeddingConfig {
            dimension,
            normalize: true,
            pooling_strategy: PoolingStrategy::Mean,
        }
    }

    #[wasm_bindgen(getter)]
    pub fn dimension(&self) -> usize {
        self.dimension
    }

    pub fn set_normalize(&mut self, normalize: bool) {
        self.normalize = normalize;
    }
}

/// Pooling strategies for combining embeddings
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum PoolingStrategy {
    /// Average pooling
    Mean,
    /// Maximum pooling
    Max,
    /// Sum pooling
    Sum,
    /// Weighted average
    Weighted,
}

/// Embedding generator with caching and batch processing
#[wasm_bindgen]
pub struct EmbeddingGenerator {
    config: EmbeddingConfig,
    cache: HashMap<String, Vec<f32>>,
    cache_enabled: bool,
}

#[wasm_bindgen]
impl EmbeddingGenerator {
    #[wasm_bindgen(constructor)]
    pub fn new(config: EmbeddingConfig) -> Self {
        EmbeddingGenerator {
            config,
            cache: HashMap::new(),
            cache_enabled: true,
        }
    }

    /// Enable or disable caching
    pub fn set_cache_enabled(&mut self, enabled: bool) {
        self.cache_enabled = enabled;
        if !enabled {
            self.cache.clear();
        }
    }

    /// Clear the cache
    pub fn clear_cache(&mut self) {
        self.cache.clear();
    }

    /// Get cache size
    pub fn cache_size(&self) -> usize {
        self.cache.len()
    }

    /// Pool multiple embeddings into one
    pub fn pool_embeddings(&self, embeddings: &[f32], count: usize) -> Result<Vec<f32>, JsValue> {
        if embeddings.len() != count * self.config.dimension {
            return Err(JsValue::from_str(&format!(
                "Invalid embeddings batch: expected {} floats, got {}",
                count * self.config.dimension,
                embeddings.len()
            )));
        }

        let dim = self.config.dimension;
        let mut result = vec![0.0; dim];

        match self.config.pooling_strategy {
            PoolingStrategy::Mean => {
                for i in 0..count {
                    let start = i * dim;
                    for j in 0..dim {
                        result[j] += embeddings[start + j];
                    }
                }
                for val in result.iter_mut() {
                    *val /= count as f32;
                }
            }
            PoolingStrategy::Max => {
                result.fill(f32::NEG_INFINITY);
                for i in 0..count {
                    let start = i * dim;
                    for j in 0..dim {
                        result[j] = result[j].max(embeddings[start + j]);
                    }
                }
            }
            PoolingStrategy::Sum => {
                for i in 0..count {
                    let start = i * dim;
                    for j in 0..dim {
                        result[j] += embeddings[start + j];
                    }
                }
            }
            PoolingStrategy::Weighted => {
                // Default to mean for now (can be extended with weights parameter)
                for i in 0..count {
                    let start = i * dim;
                    for j in 0..dim {
                        result[j] += embeddings[start + j];
                    }
                }
                for val in result.iter_mut() {
                    *val /= count as f32;
                }
            }
        }

        if self.config.normalize {
            crate::vector_search::normalize_vector(&mut result);
        }

        Ok(result)
    }
}

/// Compute embedding statistics for analysis
#[wasm_bindgen]
pub struct EmbeddingStats {
    mean: Vec<f32>,
    std_dev: Vec<f32>,
    min: Vec<f32>,
    max: Vec<f32>,
}

#[wasm_bindgen]
impl EmbeddingStats {
    /// Compute statistics from a batch of embeddings
    pub fn from_batch(embeddings: &[f32], dimension: usize) -> Result<EmbeddingStats, JsValue> {
        let count = embeddings.len() / dimension;
        if embeddings.len() != count * dimension {
            return Err(JsValue::from_str("Invalid embedding batch size"));
        }

        let mut mean = vec![0.0; dimension];
        let mut min = vec![f32::INFINITY; dimension];
        let mut max = vec![f32::NEG_INFINITY; dimension];

        // Compute mean, min, max
        for i in 0..count {
            let start = i * dimension;
            for j in 0..dimension {
                let val = embeddings[start + j];
                mean[j] += val;
                min[j] = min[j].min(val);
                max[j] = max[j].max(val);
            }
        }

        for val in mean.iter_mut() {
            *val /= count as f32;
        }

        // Compute standard deviation
        let mut std_dev = vec![0.0; dimension];
        for i in 0..count {
            let start = i * dimension;
            for j in 0..dimension {
                let diff = embeddings[start + j] - mean[j];
                std_dev[j] += diff * diff;
            }
        }

        for val in std_dev.iter_mut() {
            *val = (*val / count as f32).sqrt();
        }

        Ok(EmbeddingStats {
            mean,
            std_dev,
            min,
            max,
        })
    }

    pub fn mean(&self) -> Vec<f32> {
        self.mean.clone()
    }

    pub fn std_dev(&self) -> Vec<f32> {
        self.std_dev.clone()
    }

    pub fn min(&self) -> Vec<f32> {
        self.min.clone()
    }

    pub fn max(&self) -> Vec<f32> {
        self.max.clone()
    }
}

/// Reduce embedding dimensionality using PCA-like projection
#[wasm_bindgen]
pub fn reduce_dimensions(
    embeddings: &[f32],
    original_dim: usize,
    target_dim: usize,
) -> Result<Vec<f32>, JsValue> {
    if target_dim > original_dim {
        return Err(JsValue::from_str("Target dimension must be less than original"));
    }

    let count = embeddings.len() / original_dim;
    if embeddings.len() != count * original_dim {
        return Err(JsValue::from_str("Invalid embeddings batch size"));
    }

    // Simple dimension reduction: take first N dimensions
    // In production, this would use PCA or other methods
    let mut result = Vec::with_capacity(count * target_dim);

    for i in 0..count {
        let start = i * original_dim;
        for j in 0..target_dim {
            result.push(embeddings[start + j]);
        }
    }

    Ok(result)
}

/// Compute embedding centroid (mean vector)
#[wasm_bindgen]
pub fn compute_centroid(embeddings: &[f32], dimension: usize) -> Result<Vec<f32>, JsValue> {
    let count = embeddings.len() / dimension;
    if embeddings.len() != count * dimension {
        return Err(JsValue::from_str("Invalid embeddings batch size"));
    }

    let mut centroid = vec![0.0; dimension];

    for i in 0..count {
        let start = i * dimension;
        for j in 0..dimension {
            centroid[j] += embeddings[start + j];
        }
    }

    for val in centroid.iter_mut() {
        *val /= count as f32;
    }

    Ok(centroid)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_embeddings() {
        let config = EmbeddingConfig::new(3);
        let generator = EmbeddingGenerator::new(config);

        let embeddings = vec![
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
        ];

        let pooled = generator.pool_embeddings(&embeddings, 2).unwrap();
        assert_eq!(pooled.len(), 3);
    }

    #[test]
    fn test_embedding_stats() {
        let embeddings = vec![
            1.0, 2.0, 3.0,
            2.0, 3.0, 4.0,
            3.0, 4.0, 5.0,
        ];

        let stats = EmbeddingStats::from_batch(&embeddings, 3).unwrap();
        let mean = stats.mean();

        assert!((mean[0] - 2.0).abs() < 1e-6);
        assert!((mean[1] - 3.0).abs() < 1e-6);
        assert!((mean[2] - 4.0).abs() < 1e-6);
    }

    #[test]
    fn test_compute_centroid() {
        let embeddings = vec![
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
        ];

        let centroid = compute_centroid(&embeddings, 3).unwrap();
        assert!((centroid[0] - 1.0/3.0).abs() < 1e-6);
        assert!((centroid[1] - 1.0/3.0).abs() < 1e-6);
        assert!((centroid[2] - 1.0/3.0).abs() < 1e-6);
    }
}
