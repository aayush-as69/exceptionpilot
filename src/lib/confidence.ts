export type ConfidenceFeatures = {
  topSimilarity: number;
  secondSimilarity: number;
  evidenceCount: number;
  lexicalAgreement: number;
  citationCoverage: number;
};

export type CalibrationProfile = {
  method: 'platt';
  intercept: number;
  slope: number;
  version: string;
  dataset: string;
};

const DEFAULT_PROFILE: CalibrationProfile = {
  method: 'platt',
  intercept: -1.4,
  slope: 4.2,
  version: 'v1',
  dataset: 'retrieval-grounded-answer-calibration-v1',
};

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function calibratedConfidence(features: ConfidenceFeatures, profile = DEFAULT_PROFILE) {
  const retrieval = Math.max(0, Math.min(1, features.topSimilarity));
  const margin = Math.max(0, Math.min(1, features.topSimilarity - features.secondSimilarity + 0.5));
  const evidence = Math.max(0, Math.min(1, features.evidenceCount / 3));
  const agreement = Math.max(0, Math.min(1, features.lexicalAgreement));
  const citations = Math.max(0, Math.min(1, features.citationCoverage));
  const raw = 0.55 * retrieval + 0.15 * margin + 0.10 * evidence + 0.10 * agreement + 0.10 * citations;
  return Math.round(sigmoid(profile.intercept + profile.slope * raw) * 100) / 100;
}

export function confidenceLabel(value: number) {
  if (value >= 0.85) return 'high';
  if (value >= 0.65) return 'moderate';
  return 'low';
}
