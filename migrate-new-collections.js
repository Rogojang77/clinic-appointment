const { MongoClient } = require("mongodb");

const TEST_URI = "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin";
const LIVE_URI = "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb?authSource=admin";

// Collections to migrate (order matters: locations -> sections -> doctors -> activityschedules)
// This order ensures foreign key references are preserved correctly
const COLLECTIONS_TO_MIGRATE = ["locations", "sections", "doctors", "activityschedules"];

// Collections NOT to modify
const COLLECTIONS_TO_SKIP = ["locationschedules", "colors", "appointments", "notes", "users"];

async function migrateCollections() {
  const testClient = new MongoClient(TEST_URI);
  const liveClient = new MongoClient(LIVE_URI);

  try {
    console.log("Connecting to databases...");
    await testClient.connect();
    await liveClient.connect();
    
    const testDb = testClient.db();
    const liveDb = liveClient.db();

    console.log("\n=== Migration Summary ===");
    console.log(`Collections to migrate: ${COLLECTIONS_TO_MIGRATE.join(", ")}`);
    console.log(`Collections NOT to modify: ${COLLECTIONS_TO_SKIP.join(", ")}\n`);

    // Check existing collections in live database
    const existingCollections = await liveDb.listCollections().toArray();
    const existingCollectionNames = existingCollections.map(c => c.name);
    console.log(`Existing collections in live database: ${existingCollectionNames.join(", ")}\n`);

    // Migrate each collection
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      try {
        console.log(`Migrating ${collectionName}...`);
        
        const testCollection = testDb.collection(collectionName);
        const liveCollection = liveDb.collection(collectionName);

        // Check if collection exists in test database
        const testCount = await testCollection.countDocuments();
        if (testCount === 0) {
          console.log(`  ⚠️  Warning: ${collectionName} is empty in test database, skipping...\n`);
          continue;
        }

        // Get all documents from test database
        const documents = await testCollection.find({}).toArray();
        console.log(`  Found ${documents.length} documents in test database`);

        // Show relation fields if any
        if (documents.length > 0) {
          const sampleDoc = documents[0];
          const relationFields = Object.keys(sampleDoc).filter(key => 
            key.toLowerCase().endsWith('id') || 
            (Array.isArray(sampleDoc[key]) && sampleDoc[key].length > 0 && sampleDoc[key][0]?.constructor?.name === 'ObjectId')
          );
          if (relationFields.length > 0) {
            console.log(`  Relation fields: ${relationFields.join(", ")}`);
            // Count documents with relations
            relationFields.forEach(field => {
              const count = documents.filter(doc => doc[field] && (Array.isArray(doc[field]) ? doc[field].length > 0 : true)).length;
              console.log(`    - ${field}: ${count}/${documents.length} documents`);
            });
          }
        }

        // Check if collection already exists in live database
        const liveCount = await liveCollection.countDocuments();
        if (liveCount > 0) {
          console.log(`  ⚠️  Warning: ${collectionName} already exists in live database with ${liveCount} documents`);
          console.log(`  Adding new documents (will skip duplicates if any)...`);
        }

        // Insert documents into live database
        if (documents.length > 0) {
          // Preserve ObjectIds - MongoDB will preserve them automatically when copying
          // Use insertMany with ordered: false to continue on errors (duplicates)
          try {
            const result = await liveCollection.insertMany(documents, { ordered: false });
            console.log(`  ✅ Successfully migrated ${result.insertedCount} documents`);
            
            // Verify ObjectIds were preserved
            if (documents.length > 0) {
              const testDoc = documents[0];
              const liveDoc = await liveCollection.findOne({ _id: testDoc._id });
              if (liveDoc) {
                const relationFields = Object.keys(testDoc).filter(key => 
                  key.toLowerCase().endsWith('id') && testDoc[key]
                );
                let relationsPreserved = true;
                relationFields.forEach(field => {
                  const testValue = testDoc[field]?.toString();
                  const liveValue = liveDoc[field]?.toString();
                  if (testValue !== liveValue) {
                    relationsPreserved = false;
                  }
                });
                if (relationsPreserved && relationFields.length > 0) {
                  console.log(`  ✅ Relations preserved correctly\n`);
                } else {
                  console.log(`\n`);
                }
              } else {
                console.log(`\n`);
              }
            } else {
              console.log(`\n`);
            }
          } catch (error) {
            // Handle partial success (duplicates)
            if (error.writeErrors) {
              const inserted = error.insertedIds ? Object.keys(error.insertedIds).length : 0;
              const duplicates = error.writeErrors.filter(e => e.code === 11000).length;
              console.log(`  ✅ Migrated ${inserted} documents (${duplicates} duplicates skipped)\n`);
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Error migrating ${collectionName}:`, error.message);
        console.log("");
      }
    }

    // Verify final state and relations
    console.log("\n=== Verification ===");
    const finalCollections = await liveDb.listCollections().toArray();
    for (const collectionInfo of finalCollections) {
      const count = await liveDb.collection(collectionInfo.name).countDocuments();
      console.log(`${collectionInfo.name}: ${count} documents`);
    }

    // Verify relations
    console.log("\n=== Relation Verification ===");
    const doctorsCollection = liveDb.collection("doctors");
    const sectionsCollection = liveDb.collection("sections");
    const locationsCollection = liveDb.collection("locations");
    
    if (await doctorsCollection.countDocuments() > 0) {
      const doctorsWithSectionId = await doctorsCollection.countDocuments({ sectionId: { $exists: true } });
      const totalDoctors = await doctorsCollection.countDocuments();
      console.log(`Doctors with sectionId: ${doctorsWithSectionId}/${totalDoctors}`);
    }
    
    if (await sectionsCollection.countDocuments() > 0) {
      const sectionsWithDoctors = await sectionsCollection.countDocuments({ doctors: { $exists: true, $ne: [] } });
      const totalSections = await sectionsCollection.countDocuments();
      console.log(`Sections with doctors array: ${sectionsWithDoctors}/${totalSections}`);
    }

    console.log("\n✅ Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await testClient.close();
    await liveClient.close();
  }
}

migrateCollections();

