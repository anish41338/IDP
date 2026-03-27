// Clinical norm ranges (mirrors backend analytics.py)
const NORMS = {
  male: {
    '18-30': { height_cm: [170, 185], shoulder_width_cm: [42, 52] },
    '31-50': { height_cm: [168, 183], shoulder_width_cm: [41, 51] },
    '51+':   { height_cm: [165, 181], shoulder_width_cm: [40, 50] },
  },
  female: {
    '18-30': { height_cm: [158, 173], shoulder_width_cm: [36, 45] },
    '31-50': { height_cm: [157, 172], shoulder_width_cm: [35, 44] },
    '51+':   { height_cm: [155, 170], shoulder_width_cm: [34, 43] },
  },
}

// Posture norms apply regardless of gender/age
const POSTURE_NORMS = {
  posture_angle_deg: [-5, 5],
  symmetry_score:    [90, 100],
}

function ageBand(age) {
  if (age <= 30) return '18-30'
  if (age <= 50) return '31-50'
  return '51+'
}

/**
 * Compare a measurement set to clinical norms.
 * Returns: { [key]: { status: 'normal'|'below'|'above', value, range: [low, high] } }
 */
export function compareToNorms(measurements, age, gender) {
  if (!measurements || !age || !gender) return {}
  const gKey = gender.toLowerCase()
  const band = ageBand(Number(age))
  const structural = NORMS[gKey]?.[band] ?? NORMS.male[band]
  const all = { ...structural, ...POSTURE_NORMS }
  const result = {}

  for (const [key, [low, high]] of Object.entries(all)) {
    const val = measurements[key]
    if (val == null) continue
    result[key] = {
      status: val < low ? 'below' : val > high ? 'above' : 'normal',
      value: val,
      range: [low, high],
    }
  }

  return result
}

/**
 * Compute per-key deltas between two measurement snapshots.
 * Returns: { [key]: { diff: number, pct: number } }
 */
export function computeDelta(current, previous) {
  if (!current || !previous) return {}
  const result = {}
  for (const key of Object.keys(current)) {
    const curr = current[key]
    const prev = previous[key]
    if (typeof curr === 'number' && typeof prev === 'number' && prev !== 0) {
      result[key] = {
        diff: parseFloat((curr - prev).toFixed(2)),
        pct:  parseFloat(((curr - prev) / Math.abs(prev) * 100).toFixed(1)),
      }
    }
  }
  return result
}

// Human-readable metadata for each metric
export const METRIC_META = {
  height_cm:               { label: 'Height',             unit: 'cm' },
  shoulder_width_cm:       { label: 'Shoulder Width',     unit: 'cm' },
  arm_length_left_cm:      { label: 'Left Arm Length',    unit: 'cm' },
  arm_length_right_cm:     { label: 'Right Arm Length',   unit: 'cm' },
  torso_length_cm:         { label: 'Torso Length',       unit: 'cm' },
  inseam_estimate_cm:      { label: 'Inseam Estimate',    unit: 'cm' },
  left_shoulder_height_cm: { label: 'Left Shoulder Ht.',  unit: 'cm' },
  right_shoulder_height_cm:{ label: 'Right Shoulder Ht.', unit: 'cm' },
  posture_angle_deg:       { label: 'Posture Angle',      unit: '°',  note: 'Normal: ±5°' },
  symmetry_score:          { label: 'Symmetry Score',     unit: '%',  note: 'Normal: ≥90%' },
}
