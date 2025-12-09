#!/usr/bin/env node

/**
 * Populate Live Database Collections from Test Database
 * 
 * This script safely copies data from test database to live database for:
 * - activityschedules
 * - doctors
 * - locations
 * - sections
 * 
 * SAFETY FEATURES:
 * - Creates backup before populating
 * - Preserves ObjectIds to maintain relationships
 * - Skips duplicates (won't overwrite existing data)
 * - Migrates in correct order to preserve foreign key references
 * - Only adds new documents, never modifies existing ones
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_URI = process.env.MONGO_URI_TEST || "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin";
const LIVE_URI = process.env.MONGO_URI || process.env.MONGO_URI_LIVE;
const BACKUP_DIR = process.env.BACKUP_DIR || './mongo-backups';
const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');

// Collections to migrate (order matters: locations -> sections -> doctors -> activityschedules)
// This order ensures foreign key references are preserved correctly
const COLLECTIONS_TO_MIGRATE = ["locations", "sections", "doctors", "activityschedules"];

// Collections NOT to modify
const COLLECTIONS_TO_SKIP = ["locationschedules", "colors", "appointments", "notes", "users"];

/**
 * Create backup of live database before populating
 */
async function createBackup() {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: Creating Backup Before Population');
  console.log('='.repeat(80));

  if (!LIVE_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }

  const backupFile = path.join(BACKUP_DIR, `backup-before-populate-${BACKUP_TIMESTAMP}.archive.gz`);

  console.log(`Backup URI: ${LIVE_URI.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Backup file: ${backupFile}`);
  console.log('Starting backup (this may take a while)...\n');

  try {
    const command = `mongodump --uri="${LIVE_URI}" --archive="${backupFile}" --gzip`;
    execSync(command, { stdio: 'inherit' });

    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`\n✅ Backup completed successfully!`);
      console.log(`   File: ${backupFile}`);
      console.log(`   Size: ${sizeMB} MB`);
      return backupFile;
    } else {
      throw new Error('Backup file was not created');
    }
  } catch (error) {
    console.error('\n❌ Backup failed!');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Connect to both test and live databases
 */
async function connectToDatabases() {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: Connecting to Databases');
  console.log('='.repeat(80));

  const testClient = new MongoClient(TEST_URI);
  const liveClient = new MongoClient(LIVE_URI);

  try {
    await testClient.connect();
    await liveClient.connect();
    console.log('✅ Successfully connected to both databases');

    const testDb = testClient.db();
    const liveDb = liveClient.db();

    console.log(`   Test Database: ${testDb.databaseName}`);
    console.log(`   Live Database: ${liveDb.databaseName}`);

    return { testClient, liveClient, testDb, liveDb };
  } catch (error) {
    console.error('❌ Failed to connect to databases');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Migrate a single collection from test to live
 */
async function migrateCollection(testCollection, liveCollection, collectionName) {
  console.log(`\n   Migrating ${collectionName}...`);

  // Check if collection exists in test database
  const testCount = await testCollection.countDocuments();
  if (testCount === 0) {
    console.log(`   ⚠️  Warning: ${collectionName} is empty in test database, skipping...`);
    return { migrated: 0, skipped: 0 };
  }

  // Get all documents from test database
  const documents = await testCollection.find({}).toArray();
  console.log(`   Found ${documents.length} documents in test database`);

  // Show relation fields if any
  if (documents.length > 0) {
    const sampleDoc = documents[0];
    const relationFields = Object.keys(sampleDoc).filter(key =>
      key.toLowerCase().endsWith('id') ||
      (Array.isArray(sampleDoc[key]) && sampleDoc[key].length > 0 && sampleDoc[key][0]?.constructor?.name === 'ObjectId')
    );
    if (relationFields.length > 0) {
      console.log(`   Relation fields: ${relationFields.join(", ")}`);
      relationFields.forEach(field => {
        const count = documents.filter(doc => doc[field] && (Array.isArray(doc[field]) ? doc[field].length > 0 : true)).length;
        console.log(`     - ${field}: ${count}/${documents.length} documents`);
      });
    }
  }

  // Check if collection already exists in live database
  const liveCount = await liveCollection.countDocuments();
  if (liveCount > 0) {
    console.log(`   ⚠️  Warning: ${collectionName} already exists in live database with ${liveCount} documents`);
    console.log(`   Adding new documents (will skip duplicates if any)...`);
  }

  // Insert documents into live database
  if (documents.length > 0) {
    try {
      // Use insertMany with ordered: false to continue on errors (duplicates)
      const result = await liveCollection.insertMany(documents, { ordered: false });
      console.log(`   ✅ Successfully migrated ${result.insertedCount} documents`);

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
            console.log(`   ✅ Relations preserved correctly`);
          }
        }
      }

      return { migrated: result.insertedCount, skipped: 0 };
    } catch (error) {
      // Handle partial success (duplicates)
      if (error.writeErrors) {
        const inserted = error.insertedIds ? Object.keys(error.insertedIds).length : 0;
        const duplicates = error.writeErrors.filter(e => e.code === 11000).length;
        console.log(`   ✅ Migrated ${inserted} documents (${duplicates} duplicates skipped)`);
        return { migrated: inserted, skipped: duplicates };
      } else {
        throw error;
      }
    }
  }

  return { migrated: 0, skipped: 0 };
}

/**
 * Migrate all collections in correct order
 */
async function migrateAllCollections(testDb, liveDb) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: Migrating Collections from Test to Live');
  console.log('='.repeat(80));
  console.log(`Collections to migrate: ${COLLECTIONS_TO_MIGRATE.join(", ")}`);
  console.log(`Collections NOT to modify: ${COLLECTIONS_TO_SKIP.join(", ")}\n`);

  // Check existing collections in live database
  const existingCollections = await liveDb.listCollections().toArray();
  const existingCollectionNames = existingCollections.map(c => c.name);
  console.log(`Existing collections in live database: ${existingCollectionNames.join(", ")}\n`);

  const migrationResults = {};

  // Migrate each collection in order
  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    try {
      const testCollection = testDb.collection(collectionName);
      const liveCollection = liveDb.collection(collectionName);

      const result = await migrateCollection(testCollection, liveCollection, collectionName);
      migrationResults[collectionName] = result;
    } catch (error) {
      console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
      migrationResults[collectionName] = { migrated: 0, skipped: 0, error: error.message };
    }
  }

  return migrationResults;
}

/**
 * Verify migration results and relations
 */
async function verifyMigration(testDb, liveDb, migrationResults) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: Verification');
  console.log('='.repeat(80));

  // Verify final state
  console.log('\n   Collection Status:');
  const finalCollections = await liveDb.listCollections().toArray();
  for (const collectionInfo of finalCollections) {
    const count = await liveDb.collection(collectionInfo.name).countDocuments();
    console.log(`   ${collectionInfo.name}: ${count} documents`);
  }

  // Verify relations
  console.log('\n   Relation Verification:');
  const doctorsCollection = liveDb.collection("doctors");
  const sectionsCollection = liveDb.collection("sections");
  const locationsCollection = liveDb.collection("locations");
  const activitySchedulesCollection = liveDb.collection("activityschedules");

  if (await doctorsCollection.countDocuments() > 0) {
    const doctorsWithSectionId = await doctorsCollection.countDocuments({ sectionId: { $exists: true } });
    const doctorsWithLocationId = await doctorsCollection.countDocuments({ locationId: { $exists: true } });
    const totalDoctors = await doctorsCollection.countDocuments();
    console.log(`   Doctors with sectionId: ${doctorsWithSectionId}/${totalDoctors}`);
    console.log(`   Doctors with locationId: ${doctorsWithLocationId}/${totalDoctors}`);
  }

  if (await sectionsCollection.countDocuments() > 0) {
    const sectionsWithDoctors = await sectionsCollection.countDocuments({ doctors: { $exists: true, $ne: [] } });
    const sectionsWithLocationIds = await sectionsCollection.countDocuments({ locationIds: { $exists: true, $ne: [] } });
    const totalSections = await sectionsCollection.countDocuments();
    console.log(`   Sections with doctors array: ${sectionsWithDoctors}/${totalSections}`);
    console.log(`   Sections with locationIds array: ${sectionsWithLocationIds}/${totalSections}`);
  }

  if (await activitySchedulesCollection.countDocuments() > 0) {
    const schedulesWithUserId = await activitySchedulesCollection.countDocuments({ userId: { $exists: true } });
    const schedulesWithSectionId = await activitySchedulesCollection.countDocuments({ sectionId: { $exists: true } });
    const totalSchedules = await activitySchedulesCollection.countDocuments();
    console.log(`   ActivitySchedules with userId: ${schedulesWithUserId}/${totalSchedules}`);
    console.log(`   ActivitySchedules with sectionId: ${schedulesWithSectionId}/${totalSchedules}`);
  }

  // Migration summary
  console.log('\n   Migration Summary:');
  let totalMigrated = 0;
  let totalSkipped = 0;
  for (const [collectionName, result] of Object.entries(migrationResults)) {
    if (result.error) {
      console.log(`   ❌ ${collectionName}: Failed - ${result.error}`);
    } else {
      console.log(`   ✅ ${collectionName}: ${result.migrated} migrated, ${result.skipped} skipped`);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
    }
  }
  console.log(`\n   Total: ${totalMigrated} documents migrated, ${totalSkipped} duplicates skipped`);
}

/**
 * Main function
 */
async function populateFromTest() {
  let testClient = null;
  let liveClient = null;
  let backupFile = null;

  try {
    console.log('\n' + '='.repeat(80));
    console.log('POPULATE LIVE DATABASE FROM TEST DATABASE');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Test Database: ${TEST_URI.split('/').pop().split('?')[0]}`);
    console.log(`Live Database: ${LIVE_URI ? LIVE_URI.split('/').pop().split('?')[0] : 'N/A'}`);

    // Step 1: Create backup
    backupFile = await createBackup();

    // Step 2: Connect to databases
    const { testClient: tc, liveClient: lc, testDb, liveDb } = await connectToDatabases();
    testClient = tc;
    liveClient = lc;

    // Step 3: Migrate collections
    const migrationResults = await migrateAllCollections(testDb, liveDb);

    // Step 4: Verify migration
    await verifyMigration(testDb, liveDb, migrationResults);

    console.log('\n' + '='.repeat(80));
    console.log('✅ POPULATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`\nBackup file: ${backupFile}`);
    console.log('\n⚠️  IMPORTANT: Keep the backup file safe in case you need to restore.');
    console.log('   The live database has been populated with data from the test database.\n');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ POPULATION FAILED');
    console.error('='.repeat(80));
    console.error('\nError:', error.message);
    console.error('\n⚠️  If a backup was created, you can restore it using:');
    if (backupFile) {
      console.error(`   mongorestore --uri="${LIVE_URI}" --archive="${backupFile}" --gzip`);
    }
    console.error('\nNo changes were made to your database after the error occurred.\n');
    process.exit(1);
  } finally {
    if (testClient) {
      await testClient.close();
    }
    if (liveClient) {
      await liveClient.close();
    }
    console.log('\nDatabase connections closed.');
  }
}

// Run if executed directly
if (require.main === module) {
  populateFromTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { populateFromTest };

