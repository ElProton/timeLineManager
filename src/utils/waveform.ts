/** The vertical extent of one column of the waveform, in `[-1, 1]`. */
export interface Peak {
  min: number;
  max: number;
}

/**
 * Reduces a decoded signal to `buckets` min/max pairs — one per column of the
 * waveform drawing.
 *
 * This is the whole of the waveform maths. A waveform library would be the
 * seventh runtime dependency and roughly double the bundle, against thirty
 * lines of arithmetic that run once, when a file is attached.
 *
 * It takes the channels rather than a single `Float32Array` so a stereo file is
 * drawn from both. Mixing down first would allocate a second copy of a buffer
 * that already weighs ~60 MB for a six-minute track; taking the extent across
 * channels in the same pass costs nothing.
 */
export function computePeaks(
  channels: Float32Array[],
  buckets: number,
): Peak[] {
  const length = channels.reduce(
    (longest, channel) => Math.max(longest, channel.length),
    0,
  );
  if (buckets <= 0 || length === 0) return [];

  const step = length / buckets;
  const peaks: Peak[] = new Array(buckets);

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor(bucket * step);
    // Every bucket gets at least one sample, so asking for more columns than
    // there are samples stretches the drawing instead of leaving gaps in it.
    const end = Math.min(
      Math.max(start + 1, Math.floor((bucket + 1) * step)),
      length,
    );

    let min = Infinity;
    let max = -Infinity;

    for (const channel of channels) {
      const stop = Math.min(end, channel.length);
      for (let i = start; i < stop; i += 1) {
        const sample = channel[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
    }

    // Unreachable while `length` is the longest channel, but a column of
    // `Infinity` would become an `Infinity`-tall rectangle rather than a
    // visible mistake.
    peaks[bucket] = min === Infinity ? { min: 0, max: 0 } : { min, max };
  }

  return peaks;
}
