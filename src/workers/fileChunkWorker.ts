/**
 * Web Worker for file chunk processing
 * This offloads file reading and chunking to another thread to prevent UI blocking
 */

self.onmessage = function (e) {
  const { file, chunkSize, offset, maxChunkSize } = e.data;

  if (e.data.action === 'process') {
    // Read the slice
    const fileReader = new FileReader();
    const slice = file.slice(offset, offset + chunkSize);

    fileReader.onload = function (e) {
      if (!e.target) return;
      const chunk = e.target.result;
      const progress = Math.min(100, Math.floor((offset / file.size) * 100));

      // Send the chunk back to the main thread
      self.postMessage({
        type: 'chunk',
        chunk: chunk,
        progress: progress,
        offset: offset,
        nextOffset: offset + chunkSize,
      });
    };

    fileReader.onerror = function (_e) {
      self.postMessage({
        type: 'error',
        error: 'Error reading file chunk',
      });
    };

    fileReader.readAsArrayBuffer(slice);
  } else if (e.data.action === 'adjustSize') {
    // Adjust chunk size based on transfer rate
    const { timeTaken, lastChunkSize, transferRates } = e.data;

    // Calculate bytes per ms
    const bytesPerMs = lastChunkSize / timeTaken;
    const mbps = (bytesPerMs * 1000) / (1024 * 1024);

    // Keep track of rates
    transferRates.push(mbps);
    if (transferRates.length > 5) transferRates.shift();

    // Calculate average transfer rate
    const avgMbps =
      transferRates.reduce((sum: number, rate: number) => sum + rate, 0) /
      transferRates.length;

    // Determine new chunk size and connection quality
    let newChunkSize = chunkSize;
    let connectionQuality = 'medium';

    if (avgMbps > 8) {
      // Very fast connection (>8 MB/s)
      newChunkSize = Math.min(chunkSize * 1.5, maxChunkSize);
      connectionQuality = 'fast';
    } else if (avgMbps < 1) {
      // Slow connection (<1 MB/s)
      newChunkSize = Math.max(chunkSize / 1.5, 256 * 1024);
      connectionQuality = 'slow';
    }

    self.postMessage({
      type: 'sizeAdjusted',
      newChunkSize: newChunkSize,
      connectionQuality: connectionQuality,
      transferRates: transferRates,
    });
  }
};
