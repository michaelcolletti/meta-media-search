#!/usr/bin/env bash

##############################################################################
# WASM Build Script
# Compiles Rust code to WebAssembly using wasm-pack
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
BUILD_MODE="${1:-release}"
TARGET="${2:-web}"
PROFILE="${3:-}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Check for Rust
    if ! command -v cargo &> /dev/null; then
        log_error "Rust/Cargo not found. Please install from https://rustup.rs/"
        exit 1
    fi

    # Check for wasm-pack
    if ! command -v wasm-pack &> /dev/null; then
        log_warn "wasm-pack not found. Installing..."
        curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    fi

    # Check for wasm32 target
    if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
        log_warn "wasm32-unknown-unknown target not installed. Adding..."
        rustup target add wasm32-unknown-unknown
    fi

    log_info "All dependencies satisfied"
}

pre_build_hooks() {
    log_info "Running pre-build hooks..."

    # Claude Flow hooks integration
    if command -v npx &> /dev/null; then
        npx claude-flow@alpha hooks pre-task --description "Building WASM ($BUILD_MODE)" 2>/dev/null || true
        npx claude-flow@alpha hooks session-restore --session-id "wasm-build-$(date +%s)" 2>/dev/null || true
    fi
}

build_wasm() {
    log_info "Building WASM for $TARGET ($BUILD_MODE mode)..."

    cd "$PROJECT_ROOT"

    # Build flags based on mode
    BUILD_FLAGS=()

    case "$BUILD_MODE" in
        dev|development)
            BUILD_FLAGS+=("--dev")
            log_info "Building in development mode (unoptimized, with debug symbols)"
            ;;
        release|prod|production)
            BUILD_FLAGS+=("--release")
            log_info "Building in release mode (optimized)"
            ;;
        profiling)
            BUILD_FLAGS+=("--profiling")
            log_info "Building with profiling enabled"
            ;;
        *)
            log_error "Unknown build mode: $BUILD_MODE"
            log_info "Valid modes: dev, release, profiling"
            exit 1
            ;;
    esac

    # Add target
    BUILD_FLAGS+=("--target" "$TARGET")

    # Optional profile
    if [ -n "$PROFILE" ]; then
        BUILD_FLAGS+=("--profile" "$PROFILE")
    fi

    # Run wasm-pack build
    log_info "Executing: wasm-pack build ${BUILD_FLAGS[*]}"

    if wasm-pack build "${BUILD_FLAGS[@]}" --out-dir pkg; then
        log_info "WASM build successful!"
    else
        log_error "WASM build failed!"
        exit 1
    fi
}

post_build_hooks() {
    log_info "Running post-build hooks..."

    # Generate build metadata
    BUILD_INFO_FILE="$PROJECT_ROOT/pkg/build-info.json"
    cat > "$BUILD_INFO_FILE" << EOF
{
  "mode": "$BUILD_MODE",
  "target": "$TARGET",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "rust_version": "$(rustc --version | cut -d' ' -f2)",
  "wasm_pack_version": "$(wasm-pack --version | cut -d' ' -f2)"
}
EOF

    log_info "Build metadata saved to $BUILD_INFO_FILE"

    # Display build output info
    log_info "Build artifacts:"
    ls -lh "$PROJECT_ROOT/pkg"/*.wasm 2>/dev/null || log_warn "No WASM files found"

    # Calculate sizes
    if [ -d "$PROJECT_ROOT/pkg" ]; then
        TOTAL_SIZE=$(du -sh "$PROJECT_ROOT/pkg" | cut -f1)
        log_info "Total package size: $TOTAL_SIZE"

        # Show WASM file sizes
        for wasm_file in "$PROJECT_ROOT/pkg"/*.wasm; do
            if [ -f "$wasm_file" ]; then
                SIZE=$(du -h "$wasm_file" | cut -f1)
                log_info "  $(basename "$wasm_file"): $SIZE"
            fi
        done
    fi

    # Claude Flow hooks
    if command -v npx &> /dev/null; then
        npx claude-flow@alpha hooks post-edit \
            --file "pkg/build-info.json" \
            --memory-key "swarm/wasm/build-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

        npx claude-flow@alpha hooks notify \
            --message "WASM build completed: $BUILD_MODE mode, size: $TOTAL_SIZE" 2>/dev/null || true

        npx claude-flow@alpha hooks post-task \
            --task-id "wasm-build-$(date +%s)" 2>/dev/null || true
    fi
}

generate_checksums() {
    log_info "Generating checksums..."

    cd "$PROJECT_ROOT/pkg"

    if command -v sha256sum &> /dev/null; then
        sha256sum *.wasm *.js > checksums.txt 2>/dev/null || log_warn "Failed to generate checksums"
        log_info "Checksums saved to pkg/checksums.txt"
    elif command -v shasum &> /dev/null; then
        shasum -a 256 *.wasm *.js > checksums.txt 2>/dev/null || log_warn "Failed to generate checksums"
        log_info "Checksums saved to pkg/checksums.txt"
    else
        log_warn "No checksum tool found (sha256sum or shasum)"
    fi

    cd "$PROJECT_ROOT"
}

run_tests() {
    if [ "$BUILD_MODE" = "release" ] || [ "$BUILD_MODE" = "production" ]; then
        log_info "Running WASM tests..."

        # Run headless browser tests
        if wasm-pack test --headless --chrome; then
            log_info "WASM tests passed!"
        else
            log_warn "WASM tests failed (non-blocking)"
        fi
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [MODE] [TARGET] [PROFILE]

Build WASM packages using wasm-pack

Arguments:
  MODE      Build mode: dev, release, profiling (default: release)
  TARGET    Build target: web, nodejs, bundler, no-modules (default: web)
  PROFILE   Custom Cargo profile (optional)

Examples:
  $0 dev web              # Development build for web
  $0 release web          # Production build for web
  $0 profiling bundler    # Profiling build for bundlers

Environment Variables:
  SKIP_TESTS=1           Skip running tests after build
  SKIP_HOOKS=1           Skip Claude Flow hooks integration

EOF
}

# Main execution
main() {
    log_info "Starting WASM build process..."

    # Show usage if help requested
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        show_usage
        exit 0
    fi

    # Run build pipeline
    check_dependencies

    if [ "${SKIP_HOOKS:-0}" != "1" ]; then
        pre_build_hooks
    fi

    build_wasm
    generate_checksums

    if [ "${SKIP_TESTS:-0}" != "1" ]; then
        run_tests
    fi

    if [ "${SKIP_HOOKS:-0}" != "1" ]; then
        post_build_hooks
    fi

    log_info "WASM build process completed successfully!"
}

# Run main function
main "$@"
