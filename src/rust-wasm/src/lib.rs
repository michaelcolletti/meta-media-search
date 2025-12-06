//! Meta Media Search WASM Library
//!
//! High-performance vector operations and similarity search for browser environments.
//!
//! # Features
//!
//! - Fast cosine similarity computation
//! - Efficient vector search with multiple distance metrics
//! - WASM-optimized data structures
//! - Embedding generation utilities
//! - Batch processing support

use wasm_bindgen::prelude::*;

pub mod vector_search;
pub mod embeddings;
pub mod wasm_bindings;
pub mod utils;

// Re-export main types
pub use vector_search::{VectorIndex, DistanceMetric, SearchResult};
pub use embeddings::{EmbeddingGenerator, EmbeddingConfig};
pub use wasm_bindings::*;

/// Initialize the WASM module
///
/// This should be called once when the module is loaded.
/// Sets up panic hooks and console logging for debugging.
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    // Enable logging to browser console
    web_sys::console::log_1(&"Meta Media Search WASM module initialized".into());
}

/// Get the version of the WASM module
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        let ver = version();
        assert!(!ver.is_empty());
    }
}
