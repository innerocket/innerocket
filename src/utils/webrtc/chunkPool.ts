/**
 * Buffer pool for chunk processing to reduce allocations.
 * Buckets use power-of-two sizing for quick reuse.
 */
export class ChunkBufferPool {
  private readonly pool = new Map<number, ArrayBuffer[]>()
  private readonly maxPerBucket: number
  private readonly minBucketSize: number

  constructor(options?: { maxPerBucket?: number; minBucketSize?: number }) {
    this.maxPerBucket = options?.maxPerBucket ?? 8
    this.minBucketSize = options?.minBucketSize ?? 64 * 1024 // 64KB default
  }

  acquire(size: number): Uint8Array {
    const bucketSize = this.getBucketSize(size)
    const bucket = this.pool.get(bucketSize)

    if (bucket?.length) {
      const buffer = bucket.pop()!
      return new Uint8Array(buffer, 0, size)
    }

    return new Uint8Array(new ArrayBuffer(bucketSize), 0, size)
  }

  release(view: Uint8Array): void {
    const bucketSize = this.getBucketSize(view.byteLength)
    let bucket = this.pool.get(bucketSize)

    if (!bucket) {
      bucket = []
      this.pool.set(bucketSize, bucket)
    }

    if (bucket.length >= this.maxPerBucket) {
      return
    }

    if (
      view.byteOffset === 0 &&
      view.buffer instanceof ArrayBuffer &&
      view.buffer.byteLength === bucketSize
    ) {
      bucket.push(view.buffer)
      return
    }

    const buffer = new ArrayBuffer(bucketSize)
    new Uint8Array(buffer, 0, view.byteLength).set(view)
    bucket.push(buffer)
  }

  clear(): void {
    this.pool.clear()
  }

  private getBucketSize(size: number): number {
    const adjusted = Math.max(size, this.minBucketSize)
    const exponent = Math.ceil(Math.log2(adjusted))
    return 2 ** exponent
  }
}
