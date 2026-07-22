# Relocation Manager Database Requirements

## Core rule
Every Trust Score change, badge unlock, reward unlock, dispute update, and fraud flag must point to a verified event record.

## Required tables / collections
- **Users**
  - userId, email, phone, password hash, role, status, createdAt, updatedAt
- **Companies**
  - companyId, userId, legal name, display name, MC/DOT, insurance, authority, status
- **Roles**
  - roleId, userId, role type, active flag, timestamps
- **Equipment**
  - equipmentId, userId, equipment type, specs, photos, active flag
- **Loads**
  - loadId, postedByUserId, route, equipment, weight, rate, status, timestamps
- **Load participants**
  - loadParticipantId, loadId, userId, role in load, timestamps
- **Load status history**
  - loadStatusHistoryId, loadId, status, changedBy, verified event reference, timestamp
- **GPS and timestamp records**
  - gpsRecordId, loadId, userId, latitude, longitude, timestamp, source
- **Reviews**
  - reviewId, reviewerUserId, reviewedUserId, loadId, review type, score, notes, status, timestamps
- **Review answers**
  - reviewAnswerId, reviewId, question key, answer value, answer label
- **Trust Score history**
  - trustScoreHistoryId, userId, old score, new score, delta, reason, verified event reference, timestamp
- **Score category breakdowns**
  - breakdownId, trustScoreHistoryId or userId, category, score, weight, timestamp
- **Badges**
  - badgeId, key, label, description, unlock rules
- **User badges**
  - userBadgeId, userId, badgeId, unlockedAt, progress, locked state
- **Rewards**
  - rewardId, key, label, description, unlock rules, active flag
- **User rewards**
  - userRewardId, userId, rewardId, status, unlockedAt, progress
- **Disputes**
  - disputeId, reviewId or loadId, userId, reason, status, notes, createdAt, resolvedAt
- **Dispute evidence**
  - disputeEvidenceId, disputeId, evidence type, file reference, notes, timestamp
- **Claims**
  - claimId, loadId, userId, claim type, status, amount, evidence, timestamps
- **Verification records**
  - verificationRecordId, userId, event type, verified source, status, timestamps
- **Fraud flags**
  - fraudFlagId, userId, rule key, signal type, severity, status, timestamps
- **Administrative actions**
  - adminActionId, adminUserId, targetUserId, action type, reason, before/after values, timestamp
- **Leaderboard snapshots**
  - snapshotId, scope, role, equipment, rank, score, verified loads, active days, timestamp

## Traceability requirements
- Store a verified event reference for every score update.
- Keep old/new score values for auditability.
- Link reviews to completed verified loads only.
- Keep dispute evidence immutable once attached.
- Keep manual score changes visible in admin audit history.
- Keep leaderboard snapshots time-stamped so rank movement can be reproduced later.
