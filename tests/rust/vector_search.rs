//! Integration tests for vector search functionality

#[cfg(test)]
mod vector_search_tests {
    use meta_media_search_wasm::vector_search::*;

    #[test]
    fn test_vector_index_creation() {
        let index = VectorIndex::new(128, DistanceMetric::Cosine);
        assert_eq!(index.dimension(), 128);
        assert_eq!(index.size(), 0);
    }

    #[test]
    fn test_add_and_search() {
        let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

        // Add test vectors
        let v1 = vec![1.0, 0.0, 0.0];
        let v2 = vec![0.0, 1.0, 0.0];
        let v3 = vec![0.9, 0.1, 0.0];

        index.add_vector(&v1).unwrap();
        index.add_vector(&v2).unwrap();
        index.add_vector(&v3).unwrap();

        assert_eq!(index.size(), 3);

        // Search for similar vectors
        let query = vec![1.0, 0.0, 0.0];
        let results = index.search(&query, 2).unwrap();

        assert_eq!(results.len(), 2);
        // First result should be vector 0 (exact match)
        assert_eq!(results[0].id, 0);
        // Second result should be vector 2 (similar)
        assert_eq!(results[1].id, 2);
    }

    #[test]
    fn test_batch_operations() {
        let mut index = VectorIndex::new(3, DistanceMetric::Euclidean);

        // Add vectors in batch
        let vectors = vec![
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
            0.5, 0.5, 0.0,
        ];

        index.add_vectors_batch(&vectors, 4).unwrap();
        assert_eq!(index.size(), 4);
    }

    #[test]
    fn test_distance_metrics() {
        // Test cosine similarity
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let c = vec![0.0, 1.0, 0.0];

        let sim_same = cosine_similarity(&a, &b);
        let sim_diff = cosine_similarity(&a, &c);

        assert!((sim_same - 1.0).abs() < 1e-6);
        assert!(sim_diff.abs() < 1e-6);

        // Test Euclidean distance
        let dist = euclidean_distance(&a, &b);
        assert!(dist.abs() < 1e-6);

        let dist2 = euclidean_distance(&a, &c);
        assert!((dist2 - 2.0_f32.sqrt()).abs() < 1e-6);
    }

    #[test]
    fn test_normalization() {
        let mut vec = vec![3.0, 4.0, 0.0];
        normalize_vector(&mut vec);

        let norm: f32 = vec.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6);
        assert!((vec[0] - 0.6).abs() < 1e-6);
        assert!((vec[1] - 0.8).abs() < 1e-6);
    }

    #[test]
    fn test_batch_normalize() {
        let mut vectors = vec![
            3.0, 4.0, 0.0,
            0.0, 5.0, 12.0,
        ];

        normalize_vectors_batch(&mut vectors, 3);

        // Check first vector
        let norm1: f32 = vectors[0..3].iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm1 - 1.0).abs() < 1e-6);

        // Check second vector
        let norm2: f32 = vectors[3..6].iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm2 - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_search_empty_index() {
        let index = VectorIndex::new(3, DistanceMetric::Cosine);
        let query = vec![1.0, 0.0, 0.0];
        let results = index.search(&query, 5).unwrap();
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_search_with_different_k() {
        let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

        for i in 0..10 {
            let vec = vec![i as f32, 0.0, 0.0];
            index.add_vector(&vec).unwrap();
        }

        let query = vec![5.0, 0.0, 0.0];

        // Test k=3
        let results = index.search(&query, 3).unwrap();
        assert_eq!(results.len(), 3);

        // Test k > size
        let results = index.search(&query, 20).unwrap();
        assert_eq!(results.len(), 10);
    }

    #[test]
    fn test_manhattan_distance() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];

        let dist = manhattan_distance(&a, &b);
        assert!((dist - 9.0).abs() < 1e-6);
    }

    #[test]
    fn test_dot_product() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![2.0, 3.0, 4.0];

        let dp = dot_product(&a, &b);
        // 1*2 + 2*3 + 3*4 = 2 + 6 + 12 = 20
        assert!((dp - 20.0).abs() < 1e-6);
    }

    #[test]
    fn test_dimension_mismatch() {
        let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

        let wrong_dim = vec![1.0, 2.0];
        let result = index.add_vector(&wrong_dim);
        assert!(result.is_err());
    }

    #[test]
    fn test_clear_index() {
        let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

        index.add_vector(&[1.0, 0.0, 0.0]).unwrap();
        index.add_vector(&[0.0, 1.0, 0.0]).unwrap();

        assert_eq!(index.size(), 2);

        index.clear();
        assert_eq!(index.size(), 0);
    }

    #[test]
    fn test_get_vector() {
        let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

        let v1 = vec![1.0, 2.0, 3.0];
        index.add_vector(&v1).unwrap();

        let retrieved = index.get_vector(0).unwrap();
        assert_eq!(retrieved.len(), 3);

        // Vector should be normalized for cosine
        let norm: f32 = retrieved.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6);
    }

    #[test]
    fn test_large_batch() {
        let mut index = VectorIndex::new(128, DistanceMetric::Cosine);

        // Create a large batch of random-ish vectors
        let count = 1000;
        let mut vectors = Vec::with_capacity(count * 128);
        for i in 0..count {
            for j in 0..128 {
                vectors.push((i * j) as f32 / 1000.0);
            }
        }

        index.add_vectors_batch(&vectors, count).unwrap();
        assert_eq!(index.size(), count);

        // Search should still be fast
        let query = vec![0.5; 128];
        let results = index.search(&query, 10).unwrap();
        assert_eq!(results.len(), 10);
    }
}

#[cfg(test)]
mod embeddings_tests {
    use meta_media_search_wasm::embeddings::*;

    #[test]
    fn test_embedding_generator_creation() {
        let config = EmbeddingConfig::new(768);
        let generator = EmbeddingGenerator::new(config);

        assert_eq!(generator.cache_size(), 0);
    }

    #[test]
    fn test_pool_embeddings_mean() {
        let config = EmbeddingConfig::new(3);
        let generator = EmbeddingGenerator::new(config);

        let embeddings = vec![
            2.0, 4.0, 6.0,
            4.0, 6.0, 8.0,
        ];

        let pooled = generator.pool_embeddings(&embeddings, 2).unwrap();

        // Should be normalized, so check relative values
        assert!(pooled[0] < pooled[1]);
        assert!(pooled[1] < pooled[2]);
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

        let min = stats.min();
        assert!((min[0] - 1.0).abs() < 1e-6);

        let max = stats.max();
        assert!((max[2] - 5.0).abs() < 1e-6);
    }

    #[test]
    fn test_reduce_dimensions() {
        let embeddings = vec![
            1.0, 2.0, 3.0, 4.0,
            5.0, 6.0, 7.0, 8.0,
        ];

        let reduced = reduce_dimensions(&embeddings, 4, 2).unwrap();

        assert_eq!(reduced.len(), 4); // 2 vectors * 2 dims
        assert_eq!(reduced[0], 1.0);
        assert_eq!(reduced[1], 2.0);
        assert_eq!(reduced[2], 5.0);
        assert_eq!(reduced[3], 6.0);
    }

    #[test]
    fn test_compute_centroid() {
        let embeddings = vec![
            1.0, 0.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 0.0, 1.0,
        ];

        let centroid = compute_centroid(&embeddings, 3).unwrap();

        let expected = 1.0 / 3.0;
        assert!((centroid[0] - expected).abs() < 1e-6);
        assert!((centroid[1] - expected).abs() < 1e-6);
        assert!((centroid[2] - expected).abs() < 1e-6);
    }

    #[test]
    fn test_cache_management() {
        let config = EmbeddingConfig::new(3);
        let mut generator = EmbeddingGenerator::new(config);

        assert_eq!(generator.cache_size(), 0);

        generator.set_cache_enabled(false);
        assert_eq!(generator.cache_size(), 0);

        generator.clear_cache();
        assert_eq!(generator.cache_size(), 0);
    }
}

#[cfg(test)]
mod performance_tests {
    use meta_media_search_wasm::vector_search::*;

    #[test]
    fn benchmark_search_performance() {
        let mut index = VectorIndex::new(128, DistanceMetric::Cosine);

        // Add 10k vectors
        for i in 0..10000 {
            let mut vec = vec![0.0; 128];
            vec[i % 128] = 1.0;
            index.add_vector(&vec).unwrap();
        }

        // Search should complete quickly
        let query = vec![1.0; 128];
        let results = index.search(&query, 10).unwrap();

        assert_eq!(results.len(), 10);
    }

    #[test]
    fn benchmark_normalization() {
        let mut vectors = vec![1.0; 100 * 128]; // 100 vectors of dim 128

        normalize_vectors_batch(&mut vectors, 128);

        // Verify first vector is normalized
        let norm: f32 = vectors[0..128].iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 1e-6);
    }
}
