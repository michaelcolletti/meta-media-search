use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use meta_media_search_wasm::vector_search::*;

fn benchmark_cosine_similarity(c: &mut Criterion) {
    let mut group = c.benchmark_group("cosine_similarity");

    for size in [128, 384, 768, 1536].iter() {
        let a: Vec<f32> = (0..*size).map(|i| i as f32).collect();
        let b: Vec<f32> = (0..*size).map(|i| (i + 1) as f32).collect();

        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, _| {
            b.iter(|| cosine_similarity(black_box(&a), black_box(&a)))
        });
    }

    group.finish();
}

fn benchmark_euclidean_distance(c: &mut Criterion) {
    let mut group = c.benchmark_group("euclidean_distance");

    for size in [128, 384, 768, 1536].iter() {
        let a: Vec<f32> = (0..*size).map(|i| i as f32).collect();
        let b: Vec<f32> = (0..*size).map(|i| (i + 1) as f32).collect();

        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, _| {
            b.iter(|| euclidean_distance(black_box(&a), black_box(&a)))
        });
    }

    group.finish();
}

fn benchmark_normalize(c: &mut Criterion) {
    let mut group = c.benchmark_group("normalize_vector");

    for size in [128, 384, 768, 1536].iter() {
        let mut vec: Vec<f32> = (0..*size).map(|i| i as f32).collect();

        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, _| {
            b.iter(|| normalize_vector(black_box(&mut vec)))
        });
    }

    group.finish();
}

fn benchmark_search(c: &mut Criterion) {
    let mut group = c.benchmark_group("vector_search");

    for index_size in [100, 1000, 10000].iter() {
        let mut index = VectorIndex::new(768, DistanceMetric::Cosine);

        // Build index
        for i in 0..*index_size {
            let mut vec = vec![0.0; 768];
            vec[i % 768] = 1.0;
            index.add_vector(&vec).unwrap();
        }

        let query = vec![1.0; 768];

        group.bench_with_input(
            BenchmarkId::from_parameter(index_size),
            index_size,
            |b, _| {
                b.iter(|| index.search(black_box(&query), black_box(10)))
            },
        );
    }

    group.finish();
}

fn benchmark_batch_add(c: &mut Criterion) {
    let mut group = c.benchmark_group("batch_add");

    for batch_size in [10, 100, 1000].iter() {
        let vectors: Vec<f32> = (0..(batch_size * 768)).map(|i| i as f32).collect();

        group.bench_with_input(
            BenchmarkId::from_parameter(batch_size),
            batch_size,
            |b, &size| {
                b.iter(|| {
                    let mut index = VectorIndex::new(768, DistanceMetric::Cosine);
                    index.add_vectors_batch(black_box(&vectors), black_box(size))
                })
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    benchmark_cosine_similarity,
    benchmark_euclidean_distance,
    benchmark_normalize,
    benchmark_search,
    benchmark_batch_add
);
criterion_main!(benches);
