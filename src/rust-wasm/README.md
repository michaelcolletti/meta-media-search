# Meta-Media WASM Core

High-performance Rust/WASM components for vector search and personalization.

## Build

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build for web
wasm-pack build --target web --out-dir pkg

# Build for nodejs
wasm-pack build --target nodejs --out-dir pkg-node

# Optimize for production
wasm-pack build --release --target web
```

## Test

```bash
wasm-pack test --headless --firefox
```
