// Confidence calibration (Phase 9). Compare predicted probabilities with
// observed binary outcomes using a Brier score and reliability buckets. Only
// predictions made before the outcome was known should be passed in (spec).
// Pure.

export interface CalibrationPair {
  predicted: number; // 0..1
  outcome: 0 | 1;
}

export interface CalibrationBucket {
  lower: number;
  upper: number;
  count: number;
  predictedMean: number;
  observedFrequency: number;
}

export interface Calibration {
  sampleSize: number;
  brierScore: number | null;
  buckets: CalibrationBucket[];
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function calibrate(pairs: CalibrationPair[], bins = 10): Calibration {
  const n = pairs.length;
  const brierScore =
    n === 0
      ? null
      : round(
          pairs.reduce((a, p) => a + (p.predicted - p.outcome) ** 2, 0) / n,
        );

  const buckets: CalibrationBucket[] = [];
  for (let b = 0; b < bins; b++) {
    const lower = b / bins;
    const upper = (b + 1) / bins;
    // Last bucket is inclusive of 1.0.
    const inBucket = pairs.filter(
      (p) =>
        p.predicted >= lower &&
        (b === bins - 1 ? p.predicted <= upper : p.predicted < upper),
    );
    const count = inBucket.length;
    buckets.push({
      lower,
      upper,
      count,
      predictedMean: count
        ? round(inBucket.reduce((a, p) => a + p.predicted, 0) / count)
        : 0,
      observedFrequency: count
        ? round(inBucket.reduce((a, p) => a + p.outcome, 0) / count)
        : 0,
    });
  }

  return { sampleSize: n, brierScore, buckets };
}
