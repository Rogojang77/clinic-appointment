/**
 * One-time migration: replace section-only unique index with doctor + section partial indexes.
 *
 * Run: node scripts/migrate-appointment-indexes.js
 * Requires MONGODB_URI in .env (loaded via dotenv if available).
 */
const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is required");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const collection = mongoose.connection.collection("appointments");

  const indexes = await collection.indexes();
  const oldIndex = indexes.find(
    (idx) =>
      idx.unique &&
      idx.key?.location === 1 &&
      idx.key?.date === 1 &&
      idx.key?.time === 1 &&
      idx.key?.sectionId === 1 &&
      !idx.key?.doctorId
  );

  if (oldIndex?.name) {
    console.log(`Dropping old index: ${oldIndex.name}`);
    await collection.dropIndex(oldIndex.name);
  } else {
    console.log("Old section-only unique index not found (may already be migrated).");
  }

  await collection.createIndex(
    { location: 1, date: 1, time: 1, doctorId: 1 },
    {
      unique: true,
      partialFilterExpression: { doctorId: { $exists: true, $type: "objectId" } },
      name: "location_1_date_1_time_1_doctorId_1",
    }
  );
  console.log("Created doctor-level unique index.");

  await collection.createIndex(
    { location: 1, date: 1, time: 1, sectionId: 1 },
    {
      unique: true,
      partialFilterExpression: {
        sectionId: { $exists: true, $type: "objectId" },
        $or: [{ doctorId: { $exists: false } }, { doctorId: null }],
      },
      name: "location_1_date_1_time_1_sectionId_1_no_doctor",
    }
  );
  console.log("Created section-level unique index (no doctorId).");

  console.log("Migration complete.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
