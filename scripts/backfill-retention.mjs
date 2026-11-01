import { db, Timestamp } from "../server/firebase-admin.js";
import { retentionExpiry } from "../shared/bmi.js";

const snapshot = await db.collectionGroup("checkins").get();
let updated = 0;

for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
  const batch = db.batch();
  let pending = 0;
  for (const doc of snapshot.docs.slice(offset, offset + 400)) {
    const measuredAt = doc.data().date?.toDate?.() || new Date(doc.data().date);
    if (Number.isNaN(measuredAt.getTime())) continue;
    batch.update(doc.ref, { expiresAt: Timestamp.fromDate(retentionExpiry(measuredAt)) });
    pending += 1;
  }
  if (pending) {
    await batch.commit();
    updated += pending;
  }
}

console.log(`Retention backfill complete: ${updated} check-in(s) updated.`);
