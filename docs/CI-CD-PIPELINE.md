# Rust/WASM CI/CD Pipeline Documentation

## Overview

This document describes the comprehensive CI/CD pipeline for Rust/WASM compilation, testing, and deployment in the meta-media-search project.

## Pipeline Architecture

### GitHub Actions Workflows

#### 1. Main CI Workflow (`.github/workflows/rust-wasm-ci.yml`)

**Triggers:**
- Push to `main` and `develop` branches
- Pull requests to `main`
- Manual workflow dispatch

**Jobs:**

##### Rust Linting
- Runs `rustfmt` for code formatting checks
- Runs `clippy` for linting with warnings as errors
- Caches cargo registry, git, and build artifacts

##### Rust Testing
- **Matrix strategy:** Tests on Ubuntu, Windows, macOS
- **Rust versions:** Stable and Beta
- Runs unit tests, integration tests, and doc tests
- Utilizes aggressive caching for faster builds

##### WASM Build
- Compiles Rust to WebAssembly using `wasm-pack`
- Optimizes WASM with `wasm-opt`
- Builds both dev and release versions
- Uploads WASM artifacts for downstream jobs
- Runs headless browser tests

##### Browser Compatibility Tests
- Tests WASM in Chrome, Firefox, and Safari
- Uses Playwright for automated browser testing
- Downloads pre-built WASM artifacts
- Verifies WASM loading and execution

##### Mobile WASM Tests
- Tests WASM on Android and iOS simulators
- Sets up mobile testing infrastructure
- Validates mobile browser compatibility

##### Performance Benchmarking
- Runs Rust benchmarks with criterion
- Measures WASM file sizes
- Runs Lighthouse performance tests
- Comments benchmark results on PRs
- Uploads benchmark artifacts

##### Security Audit
- Runs `cargo-audit` for vulnerability scanning
- Runs `cargo-deny` for license and supply chain checks
- Fails on critical security advisories

##### Docker Build
- Multi-stage Docker builds for backend and frontend
- Downloads WASM artifacts
- Uses BuildKit caching for optimization
- Supports both architectures

##### Notification Hooks
- Integrates with Claude Flow hooks
- Sends build notifications
- Stores build metrics in memory
- Runs post-task coordination

#### 2. Deployment Workflow (`.github/workflows/wasm-deploy.yml`)

**Triggers:**
- Push to `main` branch
- Version tags (v*)
- Manual workflow dispatch with environment selection

**Environments:**
- Staging
- Production (with approval required)

**Jobs:**

##### Build Release
- Builds optimized production WASM
- Aggressive optimization with `wasm-opt`
- Generates SHA256 checksums
- Uploads release artifacts (30-day retention)

##### Deploy to CDN
- **AWS S3/CloudFront:** Deploys WASM to S3 with immutable caching
- **Vercel (alternative):** Supports Vercel deployment
- Invalidates CDN cache
- Sets proper cache headers

##### Deploy Containers
- Builds and pushes Docker images to:
  - GitHub Container Registry (ghcr.io)
  - Docker Hub (optional)
- Tags with version, SHA, and branch
- Uses BuildKit caching

##### GitHub Release
- Creates GitHub releases for version tags
- Attaches WASM artifacts
- Includes checksums and installation instructions
- Provides CDN links

##### Rollback on Failure
- Automatic rollback procedures
- Notifications via Claude Flow hooks
- Reverts CDN deployments

##### Post-Deploy Validation
- Smoke tests against deployed WASM
- Checksum validation
- Deployment notifications
- Stores deployment metrics

## Build Configuration

### Rust Build Settings (`config/rust/build.yml`)

```yaml
rust:
  version: stable
  targets:
    - wasm32-unknown-unknown
    - x86_64-unknown-linux-gnu
  flags:
    release:
      - "-C opt-level=3"
      - "-C lto=fat"
      - "-C codegen-units=1"
```

### WASM Optimization Levels

| Level | Flags | Use Case |
|-------|-------|----------|
| **minimal** | -O1 | Fast builds, development |
| **standard** | -O2 --converge | Balanced, CI testing |
| **aggressive** | -O3 -Oz --converge | Production, smaller size |
| **size** | -Oz --strip-debug --vacuum | Extreme optimization |

### Cache Strategy

- **Cargo registry:** `~/.cargo/registry`
- **Cargo git:** `~/.cargo/git`
- **Build artifacts:** `target/`
- **Cache key:** Hash of `Cargo.lock`

## Build Scripts

### 1. WASM Build Script (`scripts/build-wasm.sh`)

**Usage:**
```bash
./scripts/build-wasm.sh [MODE] [TARGET] [PROFILE]

# Examples
./scripts/build-wasm.sh dev web              # Development
./scripts/build-wasm.sh release web          # Production
./scripts/build-wasm.sh profiling bundler    # Profiling
```

**Features:**
- Automatic dependency checking
- Pre/post build hooks integration
- Build metadata generation
- Checksum generation
- Automated testing

**Environment Variables:**
- `SKIP_TESTS=1` - Skip tests after build
- `SKIP_HOOKS=1` - Skip Claude Flow hooks

### 2. WASM Optimization Script (`scripts/optimize-wasm.sh`)

**Usage:**
```bash
./scripts/optimize-wasm.sh [LEVEL]

# Examples
./scripts/optimize-wasm.sh standard      # Balanced
./scripts/optimize-wasm.sh aggressive    # Maximum
./scripts/optimize-wasm.sh size          # Extreme size
```

**Features:**
- Automatic backup creation
- Multiple optimization levels
- Custom section stripping
- WASM validation
- Gzip and Brotli compression
- Optimization reports

**Environment Variables:**
- `SKIP_VALIDATION=1` - Skip validation
- `SKIP_COMPRESSION=1` - Skip compression
- `STRIP_SECTIONS=0` - Disable section stripping

## Docker Configuration

### Backend Dockerfile (`Dockerfile.backend`)

**Multi-stage build:**

1. **Rust Builder Stage**
   - Base: `rust:1.75-alpine`
   - Installs musl-dev, wasm-pack
   - Compiles Rust to native and WASM
   - Optimizes for size

2. **Node Deps Stage**
   - Base: `node:18-alpine`
   - Installs npm dependencies
   - Caches node_modules

3. **Builder Stage**
   - Combines Rust artifacts with Node build
   - Builds TypeScript/JavaScript
   - Prepares production bundle

4. **Production Stage**
   - Base: `alpine:3.19`
   - Minimal Node.js runtime
   - Non-root user (nodejs:1001)
   - Health checks
   - Exposes port 3000

### Frontend Dockerfile (`Dockerfile.frontend`)

**Multi-stage build:**

1. **WASM Builder Stage**
   - Compiles Rust to WASM
   - Optimizes with wasm-opt
   - Strips debug symbols

2. **Node Deps Stage**
   - Installs frontend dependencies

3. **Builder Stage**
   - Builds Vite application
   - Integrates WASM artifacts

4. **Development Stage**
   - Hot-reload development server
   - Port 5173

5. **Production Stage**
   - Base: `nginx:alpine`
   - Serves static assets
   - WASM MIME types configured
   - Gzip and Brotli compression
   - Security headers
   - CORS configuration
   - API proxying to backend

**NGINX Configuration:**
- WASM MIME type: `application/wasm`
- Aggressive caching for WASM (1 year)
- Compression enabled
- Security headers (COOP, COEP)

## Testing Strategy

### Browser Compatibility Tests (`tests/wasm-browser-tests.spec.ts`)

**Test Coverage:**
- WASM module loading
- Function execution
- Memory allocation
- Performance benchmarks
- Feature support detection
- MIME type verification
- Error handling
- Streaming compilation
- Security headers
- File size optimization

**Browsers Tested:**
- Chrome/Chromium
- Firefox
- Safari/WebKit

**Mobile Testing:**
- Android Chrome (Pixel 5 simulation)
- iOS Safari (iPhone 12 simulation)

### Performance Benchmarks (`tests/wasm-performance.bench.ts`)

**Benchmark Categories:**
- Module load time
- Function call overhead
- Memory allocation
- Math operations (WASM vs JS)
- String processing
- Data serialization
- Memory growth
- Array operations
- Compilation performance

**Metrics Collected:**
- Average time
- Min/Max time
- Median
- Standard deviation
- Operations per second
- Speedup comparisons

## Security Considerations

### Secrets Management
- Never hardcode secrets in workflows
- Use GitHub Secrets for sensitive data
- Minimal `GITHUB_TOKEN` permissions
- Environment protection rules

### Required Secrets
- `AWS_ACCESS_KEY_ID` (optional, for CDN)
- `AWS_SECRET_ACCESS_KEY` (optional)
- `S3_BUCKET` (optional)
- `CLOUDFRONT_DISTRIBUTION_ID` (optional)
- `VERCEL_TOKEN` (optional)
- `DOCKER_USERNAME` (optional)
- `DOCKER_PASSWORD` (optional)

### Security Scanning
- `cargo-audit` for vulnerabilities
- `cargo-deny` for license compliance
- Deny list for known CVEs
- Automated security advisories

## Performance Optimization

### Build Time Optimization
- Aggressive caching strategy
- Parallel job execution
- Matrix builds for coverage
- Incremental compilation
- BuildKit caching for Docker

### WASM Size Optimization
- Link-time optimization (LTO)
- Single codegen unit
- Symbol stripping
- Dead code elimination
- wasm-opt optimization passes

### Runtime Performance
- Streaming compilation support
- Compression (Gzip/Brotli)
- CDN distribution
- Browser caching strategies
- SIMD and bulk memory features

## Monitoring and Observability

### Metrics Tracked
- Build time
- Test coverage
- Benchmark results
- WASM file sizes
- Deployment status
- Security audit results

### Notifications
- Build failures → GitHub Issues
- Test failures → Slack (configurable)
- Performance regressions → Email
- Claude Flow hooks integration

## Claude Flow Integration

### Pre-Build Hooks
```bash
npx claude-flow@alpha hooks pre-task --description "Starting build"
npx claude-flow@alpha hooks session-restore --session-id "wasm-build"
```

### Post-Build Hooks
```bash
npx claude-flow@alpha hooks post-edit --file "pkg/build-info.json" --memory-key "swarm/wasm/build"
npx claude-flow@alpha hooks notify --message "Build completed"
npx claude-flow@alpha hooks post-task --task-id "wasm-build"
```

### Session Management
```bash
npx claude-flow@alpha hooks session-end --export-metrics true
```

## Troubleshooting

### Common Issues

#### WASM Build Failures
- Check Rust toolchain version
- Verify wasm32 target installed
- Clear cargo cache
- Check for compilation errors

#### Docker Build Failures
- Verify multi-stage dependencies
- Check artifact paths
- Validate COPY commands
- Review build logs

#### Test Failures
- Browser compatibility issues
- WASM module loading errors
- Performance threshold breaches
- Network timeouts

#### Deployment Failures
- Check secrets configuration
- Verify AWS/Vercel credentials
- Review CDN invalidation
- Check Docker registry access

### Debug Commands

```bash
# Check Rust installation
cargo --version
rustc --version

# Verify WASM target
rustup target list --installed

# Test WASM build locally
./scripts/build-wasm.sh dev

# Validate WASM files
wasm-validate pkg/*.wasm

# Test Docker build
docker build -f Dockerfile.backend -t test-backend .
docker build -f Dockerfile.frontend -t test-frontend .
```

## Best Practices

### Development
1. Use development builds for faster iteration
2. Enable debug assertions
3. Run tests frequently
4. Use hooks for coordination

### CI/CD
1. Utilize caching aggressively
2. Run linters before tests
3. Parallelize independent jobs
4. Monitor build times

### Production
1. Use aggressive optimization
2. Enable compression
3. Verify checksums
4. Implement monitoring
5. Test rollback procedures

### Security
1. Regular dependency audits
2. Pin versions in production
3. Use minimal base images
4. Implement health checks
5. Follow least privilege principle

## Future Enhancements

- [ ] WebGPU support for WASM
- [ ] Service Worker integration
- [ ] Progressive Web App features
- [ ] Advanced caching strategies
- [ ] Performance regression detection
- [ ] Automated canary deployments
- [ ] Multi-region CDN distribution
- [ ] Real-time monitoring dashboard

## References

- [wasm-pack Documentation](https://rustwasm.github.io/wasm-pack/)
- [wasm-opt Documentation](https://github.com/WebAssembly/binaryen)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev/)
- [Claude Flow Documentation](https://github.com/ruvnet/claude-flow)

## Support

For issues or questions:
- Open an issue on GitHub
- Check CI/CD logs in Actions tab
- Review Claude Flow hooks output
- Consult team documentation
