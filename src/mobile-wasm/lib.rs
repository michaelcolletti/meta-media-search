// Mobile WASM Library Entry Point
pub mod mobile_core;
pub mod offline_storage;

// Re-export main types for convenience
pub use mobile_core::{
    MediaItem, SearchEngine, SearchCache, PerformanceMonitor, DataCompressor, init
};
pub use offline_storage::{OfflineStorage, StorageEntry};
