#!/usr/bin/env bash

##############################################################################
# WASM Optimization Script
# Optimizes WebAssembly binaries using wasm-opt and other tools
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PKG_DIR="$PROJECT_ROOT/pkg"

# Optimization level (default: standard)
OPT_LEVEL="${1:-standard}"

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

check_dependencies() {
    log_info "Checking optimization tools..."

    # Check for wasm-opt
    if ! command -v wasm-opt &> /dev/null; then
        log_warn "wasm-opt not found. Installing..."

        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            wget https://github.com/WebAssembly/binaryen/releases/download/version_116/binaryen-version_116-x86_64-linux.tar.gz
            tar -xzf binaryen-version_116-x86_64-linux.tar.gz
            sudo cp binaryen-version_116/bin/wasm-opt /usr/local/bin/
            rm -rf binaryen-version_116*
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install binaryen
            else
                log_error "Please install Homebrew or manually install binaryen"
                exit 1
            fi
        else
            log_error "Unsupported OS. Please install wasm-opt manually from https://github.com/WebAssembly/binaryen"
            exit 1
        fi
    fi

    log_info "All optimization tools ready"
}

backup_wasm_files() {
    log_step "Creating backups of original WASM files..."

    if [ ! -d "$PKG_DIR" ]; then
        log_error "Package directory not found: $PKG_DIR"
        log_error "Please run build-wasm.sh first"
        exit 1
    fi

    BACKUP_DIR="$PKG_DIR/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    for wasm_file in "$PKG_DIR"/*.wasm; do
        if [ -f "$wasm_file" ]; then
            cp "$wasm_file" "$BACKUP_DIR/"
            log_info "Backed up: $(basename "$wasm_file")"
        fi
    done

    log_info "Backups saved to: $BACKUP_DIR"
}

get_file_size() {
    local file="$1"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$file"
    else
        stat -c%s "$file"
    fi
}

format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$(( bytes / 1024 ))KB"
    else
        echo "$(( bytes / 1048576 ))MB"
    fi
}

optimize_wasm() {
    local wasm_file="$1"
    local opt_flags=()

    log_step "Optimizing: $(basename "$wasm_file")"

    # Get original size
    local original_size
    original_size=$(get_file_size "$wasm_file")

    # Set optimization flags based on level
    case "$OPT_LEVEL" in
        minimal)
            log_info "Using minimal optimization (faster build, larger size)"
            opt_flags=("-O1")
            ;;
        standard)
            log_info "Using standard optimization (balanced)"
            opt_flags=("-O2" "--converge")
            ;;
        aggressive)
            log_info "Using aggressive optimization (smaller size, slower build)"
            opt_flags=("-O3" "-Oz" "--converge")
            ;;
        size)
            log_info "Using extreme size optimization"
            opt_flags=(
                "-Oz"
                "--strip-debug"
                "--strip-producers"
                "--remove-unused-functions"
                "--merge-blocks"
                "--vacuum"
                "--converge"
            )
            ;;
        *)
            log_error "Unknown optimization level: $OPT_LEVEL"
            log_info "Valid levels: minimal, standard, aggressive, size"
            exit 1
            ;;
    esac

    # Add feature flags
    opt_flags+=(
        "--enable-simd"
        "--enable-bulk-memory"
        "--enable-reference-types"
    )

    # Create optimized output
    local temp_file="${wasm_file}.optimized"

    log_info "Running wasm-opt with flags: ${opt_flags[*]}"

    if wasm-opt "${opt_flags[@]}" "$wasm_file" -o "$temp_file"; then
        # Get optimized size
        local optimized_size
        optimized_size=$(get_file_size "$temp_file")

        # Calculate savings
        local saved_bytes=$((original_size - optimized_size))
        local percent_saved=$((saved_bytes * 100 / original_size))

        # Replace original with optimized
        mv "$temp_file" "$wasm_file"

        log_info "Original size:  $(format_bytes "$original_size")"
        log_info "Optimized size: $(format_bytes "$optimized_size")"
        log_info "Saved:          $(format_bytes "$saved_bytes") (${percent_saved}%)"
    else
        log_error "Optimization failed for $wasm_file"
        rm -f "$temp_file"
        return 1
    fi
}

strip_custom_sections() {
    log_step "Stripping custom sections..."

    for wasm_file in "$PKG_DIR"/*.wasm; do
        if [ -f "$wasm_file" ]; then
            log_info "Stripping: $(basename "$wasm_file")"
            wasm-opt --strip-debug --strip-producers "$wasm_file" -o "$wasm_file"
        fi
    done
}

validate_wasm() {
    log_step "Validating optimized WASM files..."

    # Check if wasm-validate is available
    if command -v wasm-validate &> /dev/null; then
        for wasm_file in "$PKG_DIR"/*.wasm; do
            if [ -f "$wasm_file" ]; then
                if wasm-validate "$wasm_file"; then
                    log_info "✓ Valid: $(basename "$wasm_file")"
                else
                    log_error "✗ Invalid: $(basename "$wasm_file")"
                    return 1
                fi
            fi
        done
    else
        log_warn "wasm-validate not found, skipping validation"
    fi
}

compress_artifacts() {
    log_step "Compressing artifacts..."

    # Gzip compression
    for wasm_file in "$PKG_DIR"/*.wasm; do
        if [ -f "$wasm_file" ]; then
            gzip -9 -k "$wasm_file"

            local original_size
            local gzip_size
            original_size=$(get_file_size "$wasm_file")
            gzip_size=$(get_file_size "${wasm_file}.gz")

            local compression_ratio=$((gzip_size * 100 / original_size))

            log_info "$(basename "$wasm_file").gz: $(format_bytes "$gzip_size") (${compression_ratio}% of original)"
        fi
    done

    # Brotli compression (if available)
    if command -v brotli &> /dev/null; then
        for wasm_file in "$PKG_DIR"/*.wasm; do
            if [ -f "$wasm_file" ]; then
                brotli -9 -k "$wasm_file"

                local original_size
                local br_size
                original_size=$(get_file_size "$wasm_file")
                br_size=$(get_file_size "${wasm_file}.br")

                local compression_ratio=$((br_size * 100 / original_size))

                log_info "$(basename "$wasm_file").br: $(format_bytes "$br_size") (${compression_ratio}% of original)"
            fi
        done
    else
        log_warn "brotli not found, skipping Brotli compression"
    fi
}

generate_optimization_report() {
    log_step "Generating optimization report..."

    local report_file="$PKG_DIR/optimization-report.txt"

    cat > "$report_file" << EOF
WASM Optimization Report
========================
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Optimization Level: $OPT_LEVEL

File Sizes:
-----------
EOF

    for wasm_file in "$PKG_DIR"/*.wasm; do
        if [ -f "$wasm_file" ]; then
            local size
            size=$(get_file_size "$wasm_file")
            echo "$(basename "$wasm_file"): $(format_bytes "$size")" >> "$report_file"
        fi
    done

    echo "" >> "$report_file"
    echo "Compressed Sizes:" >> "$report_file"
    echo "----------------" >> "$report_file"

    for gz_file in "$PKG_DIR"/*.wasm.gz; do
        if [ -f "$gz_file" ]; then
            local size
            size=$(get_file_size "$gz_file")
            echo "$(basename "$gz_file"): $(format_bytes "$size")" >> "$report_file"
        fi
    done

    log_info "Report saved to: $report_file"
    cat "$report_file"
}

post_optimization_hooks() {
    log_step "Running post-optimization hooks..."

    if command -v npx &> /dev/null; then
        npx claude-flow@alpha hooks post-edit \
            --file "pkg/optimization-report.txt" \
            --memory-key "swarm/wasm/optimization-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

        npx claude-flow@alpha hooks notify \
            --message "WASM optimization completed: $OPT_LEVEL level" 2>/dev/null || true
    fi
}

show_usage() {
    cat << EOF
Usage: $0 [LEVEL]

Optimize WASM binaries using wasm-opt

Arguments:
  LEVEL     Optimization level: minimal, standard, aggressive, size
            Default: standard

Examples:
  $0 standard      # Balanced optimization
  $0 aggressive    # Maximum optimization
  $0 size          # Extreme size optimization

Environment Variables:
  SKIP_VALIDATION=1    Skip WASM validation
  SKIP_COMPRESSION=1   Skip artifact compression
  SKIP_HOOKS=1         Skip Claude Flow hooks

EOF
}

# Main execution
main() {
    log_info "Starting WASM optimization process..."

    # Show usage if help requested
    if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
        show_usage
        exit 0
    fi

    # Run optimization pipeline
    check_dependencies
    backup_wasm_files

    # Optimize each WASM file
    for wasm_file in "$PKG_DIR"/*.wasm; do
        if [ -f "$wasm_file" ]; then
            optimize_wasm "$wasm_file"
        fi
    done

    # Additional optimizations
    if [ "${STRIP_SECTIONS:-1}" = "1" ]; then
        strip_custom_sections
    fi

    # Validation
    if [ "${SKIP_VALIDATION:-0}" != "1" ]; then
        validate_wasm
    fi

    # Compression
    if [ "${SKIP_COMPRESSION:-0}" != "1" ]; then
        compress_artifacts
    fi

    # Generate report
    generate_optimization_report

    # Hooks
    if [ "${SKIP_HOOKS:-0}" != "1" ]; then
        post_optimization_hooks
    fi

    log_info "WASM optimization completed successfully!"
}

# Run main function
main "$@"
