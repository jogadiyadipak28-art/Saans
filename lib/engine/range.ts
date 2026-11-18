export type MetricRange = {
  low: number
  central: number
  high: number
  unit: string
}

export function roundTo(value: number, digits: number): number {
  const power = 10 ** digits
  return Math.round((value + Number.EPSILON) * power) / power
}

/** Builds a range and forces low ≤ central ≤ high so callers cannot show false precision or inverted bounds. */
export function metric(
  low: number,
  central: number,
  high: number,
  unit: string,
  digits = 1,
): MetricRange {
  const values = [low, central, high].map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite metric for unit ${unit}`)
    }
    return roundTo(value, digits)
  })
  const sorted = [...values].sort((a, b) => a - b)
  const lowBound = sorted[0] ?? 0
  const highBound = sorted[2] ?? 0
  const centralBound = Math.min(highBound, Math.max(lowBound, values[1] ?? lowBound))
  return {
    low: lowBound,
    central: roundTo(centralBound, digits),
    high: highBound,
    unit,
  }
}

export function addMetrics(ranges: MetricRange[], unit: string, digits = 1): MetricRange {
  if (ranges.length === 0) return metric(0, 0, 0, unit, digits)
  return metric(
    ranges.reduce((sum, item) => sum + item.low, 0),
    ranges.reduce((sum, item) => sum + item.central, 0),
    ranges.reduce((sum, item) => sum + item.high, 0),
    unit,
    digits,
  )
}

export function scaleMetric(range: MetricRange, factor: number, digits = 1, unit = range.unit): MetricRange {
  return metric(range.low * factor, range.central * factor, range.high * factor, unit, digits)
}

/**
 * Positive means the next value is lower than the baseline (a reduction).
 * The low/high ends use the crossed bounds so the interval stays honest.
 */
export function reductionPercent(baseline: MetricRange, next: MetricRange): MetricRange {
  if (baseline.central <= 0) return metric(0, 0, 0, '%', 1)
  const central = ((baseline.central - next.central) / baseline.central) * 100
  const low = ((baseline.low - next.high) / Math.max(baseline.low, baseline.central)) * 100
  const high = ((baseline.high - next.low) / Math.max(baseline.high, baseline.central)) * 100
  return metric(low, central, high, '%', 1)
}

export function difference(baseline: MetricRange, next: MetricRange, unit: string, digits = 1): MetricRange {
  return metric(baseline.low - next.high, baseline.central - next.central, baseline.high - next.low, unit, digits)
}

export function isOrdered(range: MetricRange): boolean {
  return range.low <= range.central && range.central <= range.high
}
