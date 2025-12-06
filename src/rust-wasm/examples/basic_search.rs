//! Basic vector search example
//!
//! Run with: cargo run --example basic_search

use meta_media_search_wasm::vector_search::{VectorIndex, DistanceMetric};

fn main() {
    println!("Meta Media Search - Basic Vector Search Example\n");

    // Create a 3-dimensional index with cosine similarity
    let mut index = VectorIndex::new(3, DistanceMetric::Cosine);

    // Add some vectors
    println!("Adding vectors to index...");
    let vectors = vec![
        vec![1.0, 0.0, 0.0],  // Vector 0
        vec![0.0, 1.0, 0.0],  // Vector 1
        vec![0.0, 0.0, 1.0],  // Vector 2
        vec![0.9, 0.1, 0.0],  // Vector 3 (similar to 0)
        vec![0.1, 0.9, 0.0],  // Vector 4 (similar to 1)
    ];

    for (i, vec) in vectors.iter().enumerate() {
        index.add_vector(vec).unwrap();
        println!("  Added vector {}: {:?}", i, vec);
    }

    println!("\nIndex contains {} vectors\n", index.size());

    // Search for vectors similar to [1, 0, 0]
    let query = vec![1.0, 0.0, 0.0];
    println!("Searching for vectors similar to {:?}", query);

    let results = index.search(&query, 3).unwrap();

    println!("\nTop 3 results:");
    for (rank, result) in results.iter().enumerate() {
        let vector = index.get_vector(result.id).unwrap();
        println!(
            "  {}. Vector {} (score: {:.4}): {:?}",
            rank + 1,
            result.id,
            result.score,
            vector
        );
    }

    // Test different metrics
    println!("\n--- Testing Different Distance Metrics ---\n");

    let metrics = vec![
        ("Cosine", DistanceMetric::Cosine),
        ("Euclidean", DistanceMetric::Euclidean),
        ("Manhattan", DistanceMetric::Manhattan),
        ("DotProduct", DistanceMetric::DotProduct),
    ];

    for (name, metric) in metrics {
        let mut index = VectorIndex::new(3, metric);

        for vec in &vectors {
            index.add_vector(vec).unwrap();
        }

        let results = index.search(&query, 3).unwrap();

        println!("{} similarity:", name);
        for result in results {
            println!("  Vector {}: score = {:.4}", result.id, result.score);
        }
        println!();
    }
}
