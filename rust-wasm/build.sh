#!/bin/bash
# Build script for Rust WASM module

set -e

echo "Building Rust WASM module..."

# Install wasm-pack if not already installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build for web target
echo "Building for web target..."
wasm-pack build --target web --out-dir pkg

# Run Rust tests
echo "Running Rust unit tests..."
cargo test --lib

# Run WASM tests
echo "Running WASM integration tests..."
wasm-pack test --headless --chrome
wasm-pack test --headless --firefox

echo "Build and tests completed successfully!"
