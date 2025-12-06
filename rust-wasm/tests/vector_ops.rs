//! Comprehensive unit tests for vector operations
//!
//! Test coverage includes:
//! - Edge cases (empty vectors, zero vectors)
//! - Boundary conditions (very large/small values)
//! - Performance characteristics
//! - Error handling

use approx::assert_relative_eq;
use meta_media_wasm::*;

#[cfg(test)]
mod vector_operations {
    use super::*;

    #[test]
    fn test_cosine_similarity_identical_vectors() {
        let a = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let b = vec![1.0, 2.0, 3.0, 4.0, 5.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_cosine_similarity_opposite_vectors() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![-1.0, -2.0, -3.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, -1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_cosine_similarity_orthogonal_vectors() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, 0.0, epsilon = 1e-6);
    }

    #[test]
    fn test_cosine_similarity_zero_vector() {
        let a = vec![0.0, 0.0, 0.0];
        let b = vec![1.0, 2.0, 3.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_cosine_similarity_mismatched_dimensions() {
        let a = vec![1.0, 2.0];
        let b = vec![1.0, 2.0, 3.0];
        let result = cosine_similarity(&a, &b);
        assert!(result.is_err());
    }

    #[test]
    fn test_normalize_vector_standard() {
        let vec = vec![3.0, 4.0];
        let normalized = normalize_vector(&vec);
        assert_relative_eq!(normalized[0], 0.6, epsilon = 1e-6);
        assert_relative_eq!(normalized[1], 0.8, epsilon = 1e-6);

        let magnitude = vector_magnitude(&normalized);
        assert_relative_eq!(magnitude, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_normalize_vector_zero() {
        let vec = vec![0.0, 0.0, 0.0];
        let normalized = normalize_vector(&vec);
        assert_eq!(normalized, vec);
    }

    #[test]
    fn test_normalize_vector_high_dimension() {
        let vec: Vec<f32> = (1..=1536).map(|x| x as f32).collect();
        let normalized = normalize_vector(&vec);
        let magnitude = vector_magnitude(&normalized);
        assert_relative_eq!(magnitude, 1.0, epsilon = 1e-4);
    }

    #[test]
    fn test_knn_search_basic() {
        let query = vec![1.0, 0.0, 0.0];
        let vectors = vec![
            1.0, 0.0, 0.0, // Should be rank 1 (similarity = 1.0)
            0.8, 0.6, 0.0, // Should be rank 2
            0.0, 1.0, 0.0, // Should be rank 3
            -1.0, 0.0, 0.0, // Should be rank 4 (similarity = -1.0)
        ];

        let results = knn_search(&query, &vectors, 3, 2).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_knn_search_large_dataset() {
        let query = vec![1.0; 128];
        let mut vectors = Vec::new();

        // Create 1000 vectors of dimension 128
        for i in 0..1000 {
            for j in 0..128 {
                vectors.push((i + j) as f32 / 1000.0);
            }
        }

        let results = knn_search(&query, &vectors, 128, 10).unwrap();
        assert_eq!(results.len(), 10);
    }

    #[test]
    fn test_knn_search_invalid_dimensions() {
        let query = vec![1.0, 0.0];
        let vectors = vec![1.0, 0.0, 0.0]; // Not divisible by vector_dim
        let result = knn_search(&query, &vectors, 2, 1);
        assert!(result.is_err());
    }

    #[test]
    fn test_batch_cosine_similarity() {
        let query = vec![1.0, 0.0, 0.0];
        let vectors = vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0];

        let results = batch_cosine_similarity(&query, &vectors, 3).unwrap();
        assert_eq!(results.len(), 3);
        assert_relative_eq!(results[0], 1.0, epsilon = 1e-6);
        assert_relative_eq!(results[1], 0.0, epsilon = 1e-6);
        assert_relative_eq!(results[2], 0.0, epsilon = 1e-6);
    }

    #[test]
    fn test_dot_product_basic() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![4.0, 5.0, 6.0];
        let result = dot_product(&a, &b).unwrap();
        assert_eq!(result, 32.0);
    }

    #[test]
    fn test_dot_product_zero() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![0.0, 0.0, 0.0];
        let result = dot_product(&a, &b).unwrap();
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_vector_magnitude_unit() {
        let vec = vec![1.0, 0.0, 0.0];
        let magnitude = vector_magnitude(&vec);
        assert_relative_eq!(magnitude, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_vector_magnitude_pythagorean() {
        let vec = vec![3.0, 4.0];
        let magnitude = vector_magnitude(&vec);
        assert_relative_eq!(magnitude, 5.0, epsilon = 1e-6);
    }

    #[test]
    fn test_performance_large_vectors() {
        let a: Vec<f32> = (0..10000).map(|x| x as f32).collect();
        let b: Vec<f32> = (0..10000).map(|x| (x * 2) as f32).collect();

        let start = std::time::Instant::now();
        let _ = cosine_similarity(&a, &b).unwrap();
        let duration = start.elapsed();

        // Should complete in under 1ms
        assert!(duration.as_millis() < 1);
    }
}

#[cfg(test)]
mod edge_cases {
    use super::*;

    #[test]
    fn test_very_small_values() {
        let a = vec![1e-10, 2e-10, 3e-10];
        let b = vec![1e-10, 2e-10, 3e-10];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_very_large_values() {
        let a = vec![1e10, 2e10, 3e10];
        let b = vec![1e10, 2e10, 3e10];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_mixed_sign_values() {
        let a = vec![1.0, -2.0, 3.0, -4.0];
        let b = vec![-1.0, 2.0, -3.0, 4.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, -1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_single_dimension() {
        let a = vec![5.0];
        let b = vec![10.0];
        let result = cosine_similarity(&a, &b).unwrap();
        assert_relative_eq!(result, 1.0, epsilon = 1e-6);
    }

    #[test]
    fn test_high_dimensional_vectors() {
        // Test with OpenAI embedding dimensions
        let a: Vec<f32> = (0..1536).map(|x| (x as f32).sin()).collect();
        let b: Vec<f32> = (0..1536).map(|x| (x as f32).cos()).collect();
        let result = cosine_similarity(&a, &b);
        assert!(result.is_ok());
    }
}

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn test_cosine_similarity_range(
            a in prop::collection::vec(any::<f32>(), 10..100),
            b in prop::collection::vec(any::<f32>(), 10..100)
        ) {
            if a.len() == b.len() && a.iter().all(|x| x.is_finite()) && b.iter().all(|x| x.is_finite()) {
                if let Ok(result) = cosine_similarity(&a, &b) {
                    prop_assert!(result >= -1.0 && result <= 1.0 || result.is_nan());
                }
            }
        }

        #[test]
        fn test_normalize_produces_unit_vector(
            vec in prop::collection::vec(-1000.0f32..1000.0f32, 10..100)
        ) {
            let normalized = normalize_vector(&vec);
            let magnitude = vector_magnitude(&normalized);

            if vec.iter().any(|&x| x != 0.0) {
                prop_assert!((magnitude - 1.0).abs() < 1e-4);
            }
        }
    }
}
