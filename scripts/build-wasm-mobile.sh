#!/bin/bash
# Build script for mobile-optimized WASM modules

set -e

echo "🔧 Building mobile-optimized WASM modules..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SOURCE_DIR="src/mobile-wasm"
BUILD_DIR="src/mobile-wasm/pkg"
TARGET_SIZE=$((450 * 1024))  # 450KB target
MAX_SIZE=$((500 * 1024))     # 500KB maximum

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo -e "${RED}❌ wasm-pack not found. Installing...${NC}"
    cargo install wasm-pack
fi

# Check if wasm-opt is installed
if ! command -v wasm-opt &> /dev/null; then
    echo -e "${YELLOW}⚠️  wasm-opt not found. Install it for better optimization.${NC}"
    echo "    brew install binaryen  # macOS"
    echo "    apt install binaryen   # Linux"
fi

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf "$BUILD_DIR"

# Build with wasm-pack
echo "🏗️  Building WASM module..."
cd "$SOURCE_DIR"

wasm-pack build \
  --target bundler \
  --release \
  --out-dir pkg \
  --scope meta-media

# Run wasm-opt for additional optimization
if command -v wasm-opt &> /dev/null; then
    echo "⚡ Running wasm-opt for maximum optimization..."

    WASM_FILE="pkg/meta_media_mobile_wasm_bg.wasm"

    if [ -f "$WASM_FILE" ]; then
        # Backup original
        cp "$WASM_FILE" "${WASM_FILE}.bak"

        # Run optimization
        wasm-opt -O4 \
          --enable-mutable-globals \
          --enable-sign-ext \
          --enable-simd \
          --strip-debug \
          --strip-dwarf \
          --strip-producers \
          --converge \
          "$WASM_FILE" \
          -o "$WASM_FILE"

        # Compare sizes
        ORIGINAL_SIZE=$(stat -f%z "${WASM_FILE}.bak" 2>/dev/null || stat -c%s "${WASM_FILE}.bak")
        OPTIMIZED_SIZE=$(stat -f%z "$WASM_FILE" 2>/dev/null || stat -c%s "$WASM_FILE")
        SAVED=$((ORIGINAL_SIZE - OPTIMIZED_SIZE))

        echo -e "${GREEN}✅ Optimization saved ${SAVED} bytes${NC}"
        rm "${WASM_FILE}.bak"
    fi
fi

# Compress with Brotli
if command -v brotli &> /dev/null; then
    echo "📦 Compressing with Brotli..."

    for file in pkg/*.wasm pkg/*.js; do
        if [ -f "$file" ]; then
            brotli -q 11 -f "$file"

            ORIGINAL=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            COMPRESSED=$(stat -f%z "${file}.br" 2>/dev/null || stat -c%s "${file}.br")
            RATIO=$(echo "scale=2; $COMPRESSED * 100 / $ORIGINAL" | bc)

            echo "  ${file##*/}: ${ORIGINAL} → ${COMPRESSED} bytes (${RATIO}%)"
        fi
    done
fi

cd ../..

# Check bundle size
echo ""
echo "📊 Bundle Size Analysis:"
echo "========================"

WASM_FILE="$SOURCE_DIR/pkg/meta_media_mobile_wasm_bg.wasm"
if [ -f "$WASM_FILE" ]; then
    SIZE=$(stat -f%z "$WASM_FILE" 2>/dev/null || stat -c%s "$WASM_FILE")
    SIZE_KB=$((SIZE / 1024))
    TARGET_KB=$((TARGET_SIZE / 1024))
    MAX_KB=$((MAX_SIZE / 1024))

    echo "WASM bundle: ${SIZE_KB}KB"
    echo "Target: ${TARGET_KB}KB"
    echo "Maximum: ${MAX_KB}KB"

    if [ $SIZE -le $TARGET_SIZE ]; then
        echo -e "${GREEN}✅ Bundle size meets target!${NC}"
    elif [ $SIZE -le $MAX_SIZE ]; then
        echo -e "${YELLOW}⚠️  Bundle size exceeds target but within maximum${NC}"
    else
        echo -e "${RED}❌ Bundle size exceeds maximum!${NC}"
        exit 1
    fi

    # Check compressed size if available
    if [ -f "${WASM_FILE}.br" ]; then
        COMPRESSED_SIZE=$(stat -f%z "${WASM_FILE}.br" 2>/dev/null || stat -c%s "${WASM_FILE}.br")
        COMPRESSED_KB=$((COMPRESSED_SIZE / 1024))
        echo "Compressed: ${COMPRESSED_KB}KB"
    fi
fi

echo ""
echo "📦 Generated files:"
ls -lh "$SOURCE_DIR/pkg/"

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Test with: npm run test:wasm"
echo "  2. Deploy to: src/frontend/wasm/"
echo "  3. Update service worker cache"
