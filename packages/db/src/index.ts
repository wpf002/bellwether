export * as schema from "./schema.js";
export { getDb } from "./client.js";
export type { Database } from "./client.js";
export { sourceHealth, unhealthySources } from "./queries.js";
export type { SourceHealth } from "./queries.js";
export {
  recordFeedback,
  feedbackSummary,
  sourcePriority,
  scoreSource,
  computeQualityNow,
  saveQualitySnapshot,
  qualityHistory,
  listDigests,
  shipDigest,
} from "./feedback.js";
export type {
  FeedbackKind,
  RecordFeedbackInput,
  SourcePriority,
  QualitySnapshotRow,
  DigestListItem,
} from "./feedback.js";
export {
  hashApiKey,
  generateApiKey,
  authenticate,
  createOrg,
  createApiKey,
  orgEntitlements,
  isEntitled,
  subscribe,
  recordAudit,
  platformMetrics,
} from "./accounts.js";
export type { AuthContext, SignupResult, PlatformMetrics } from "./accounts.js";
