#!/bin/bash
# Build script for Rust/WASM module

set -e

echo "Building Meta Media Search WASM module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Error: wasm-pack is not installed"
    echo "Install with: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh"
    exit 1
fi

# Parse arguments
TARGET="web"
PROFILE="release"

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            PROFILE="dev"
            shift
            ;;
        --target)
            TARGET="$2"
            shift 2
            ;;
        --help)
            echo "Usage: ./build.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev              Build in development mode (faster, larger)"
            echo "  --target TARGET    Build target: web, nodejs, bundler (default: web)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build based on profile
if [ "$PROFILE" = "dev" ]; then
    echo "Building for development..."
    wasm-pack build --target $TARGET --dev
else
    echo "Building for production..."
    wasm-pack build --target $TARGET --release
fi

# Copy TypeScript definitions
if [ -f "pkg/meta_media_search_wasm.d.ts" ]; then
    echo "Copying TypeScript definitions..."
    cp pkg/meta_media_search_wasm.d.ts ../types/wasm.d.ts 2>/dev/null || true
fi

# Show build results
echo ""
echo "Build complete!"
echo "Target: $TARGET"
echo "Profile: $PROFILE"
echo ""
echo "Output files:"
ls -lh pkg/ | grep -E '\.(wasm|js|ts)$' || true

# Show WASM size
if [ -f "pkg/meta_media_search_wasm_bg.wasm" ]; then
    WASM_SIZE=$(stat -f%z pkg/meta_media_search_wasm_bg.wasm 2>/dev/null || stat -c%s pkg/meta_media_search_wasm_bg.wasm 2>/dev/null)
    WASM_SIZE_KB=$((WASM_SIZE / 1024))
    echo ""
    echo "WASM binary size: ${WASM_SIZE_KB} KB"

    if [ $WASM_SIZE_KB -gt 1000 ]; then
        echo "⚠️  Warning: Large WASM binary. Consider optimization."
    else
        echo "✓ WASM binary size is acceptable"
    fi
fi

echo ""
echo "Usage example:"
echo "  import init from './pkg/meta_media_search_wasm.js';"
echo "  await init();"
