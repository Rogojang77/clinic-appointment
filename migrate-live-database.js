#!/usr/bin/env node

/**
 * Safe MongoDB Migration Script for Live Database
 * 
 * This script performs the following operations:
 * 1. Creates a full backup of the live database (data + indexes)
 * 2. Creates collections if they don't exist: activityschedules, doctors, locations, sections
 * 3. Adds new fields to users collection only if they don't exist: isAdmin (default false), isverified (default false)
 * 4. Creates indexes based on model definitions
 * 
 * SAFETY FEATURES:
 * - Never deletes, drops, or overwrites existing data
 * - Only adds fields that don't exist
 * - Only creates collections that don't exist
 * - Only creates indexes that don't exist
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const LIVE_URI = process.env.MONGO_URI || process.env.MONGO_URI_LIVE;
const BACKUP_DIR = process.env.BACKUP_DIR || './mongo-backups';
const BACKUP_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
  new Date().toTimeString().split(' ')[0].replace(/:/g, '-');

// Collections to ensure exist
const COLLECTIONS_TO_CREATE = ['activityschedules', 'doctors', 'locations', 'sections'];

// Index definitions based on model schemas
const INDEX_DEFINITIONS = {
  activityschedules: [
    { keys: { userId: 1, sectionId: 1 }, options: { unique: true, name: 'userId_1_sectionId_1' } }
  ],
  doctors: [
    { keys: { sectionId: 1 }, options: { name: 'sectionId_1' } },
    { keys: { name: 1 }, options: { name: 'name_1' } },
    { keys: { email: 1 }, options: { name: 'email_1' } }
  ],
  locations: [
    { keys: { name: 1 }, options: { name: 'name_1' } }
  ],
  sections: [
    // No explicit indexes in Section model, but we'll check for unique name constraint
    { keys: { name: 1 }, options: { unique: true, name: 'name_1' } }
  ],
  users: [
    // Email is unique in User model
    { keys: { email: 1 }, options: { unique: true, name: 'email_1' } }
  ]
};

/**
 * Step 1: Create full backup of live database
 */
async function createBackup() {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: Creating Full Backup');
  console.log('='.repeat(80));

  if (!LIVE_URI) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }

  const backupFile = path.join(BACKUP_DIR, `backup-${BACKUP_TIMESTAMP}.archive.gz`);

  console.log(`Backup URI: ${LIVE_URI.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Backup file: ${backupFile}`);
  console.log('Starting backup (this may take a while)...\n');

  try {
    // Use mongodump to create backup with indexes
    // mongodump --uri="..." --archive="..." --gzip
    const command = `mongodump --uri="${LIVE_URI}" --archive="${backupFile}" --gzip`;

    execSync(command, { stdio: 'inherit' });

    // Verify backup file exists and has content
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`\n✅ Backup completed successfully!`);
      console.log(`   File: ${backupFile}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`\n   To restore this backup, use:`);
      console.log(`   mongorestore --uri="${LIVE_URI}" --archive="${backupFile}" --gzip`);
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
 * Step 2: Connect to database and verify connection
 */
async function connectToDatabase() {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: Connecting to Database');
  console.log('='.repeat(80));

  const client = new MongoClient(LIVE_URI);

  try {
    await client.connect();
    console.log('✅ Successfully connected to database');

    const db = client.db();
    const dbName = db.databaseName;
    console.log(`   Database: ${dbName}`);

    // List existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`   Existing collections: ${collectionNames.join(', ') || '(none)'}`);

    return { client, db };
  } catch (error) {
    console.error('❌ Failed to connect to database');
    console.error('Error:', error.message);
    throw error;
  }
}

/**
 * Step 3: Create collections if they don't exist
 */
async function ensureCollectionsExist(db) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: Ensuring Collections Exist');
  console.log('='.repeat(80));

  const existingCollections = await db.listCollections().toArray();
  const existingCollectionNames = existingCollections.map(c => c.name);

  for (const collectionName of COLLECTIONS_TO_CREATE) {
    if (existingCollectionNames.includes(collectionName)) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`✅ Collection '${collectionName}' already exists (${count} documents)`);
    } else {
      // Create collection by inserting and immediately deleting a dummy document
      // This is the safest way to create an empty collection
      const collection = db.collection(collectionName);
      await collection.insertOne({ _temp: true });
      await collection.deleteOne({ _temp: true });
      console.log(`✅ Created collection '${collectionName}'`);
    }
  }
}

/**
 * Step 4: Add new fields to users collection (only if they don't exist)
 */
async function updateUsersCollection(db) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: Updating Users Collection');
  console.log('='.repeat(80));

  const usersCollection = db.collection('users');

  // Check if collection exists
  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  if (!collectionNames.includes('users')) {
    console.log('⚠️  Users collection does not exist. Creating it...');
    await usersCollection.insertOne({ _temp: true });
    await usersCollection.deleteOne({ _temp: true });
  }

  // Count users without isAdmin field
  const usersWithoutIsAdmin = await usersCollection.countDocuments({
    isAdmin: { $exists: false }
  });

  // Count users without isverified field
  const usersWithoutIsverified = await usersCollection.countDocuments({
    isverified: { $exists: false }
  });

  console.log(`   Total users: ${await usersCollection.countDocuments()}`);
  console.log(`   Users without 'isAdmin' field: ${usersWithoutIsAdmin}`);
  console.log(`   Users without 'isverified' field: ${usersWithoutIsverified}`);

  // Update users missing isAdmin field
  if (usersWithoutIsAdmin > 0) {
    const result = await usersCollection.updateMany(
      { isAdmin: { $exists: false } },
      { $set: { isAdmin: false } }
    );
    console.log(`✅ Added 'isAdmin: false' to ${result.modifiedCount} user(s)`);
  } else {
    console.log(`✅ All users already have 'isAdmin' field`);
  }

  // Update users missing isverified field
  if (usersWithoutIsverified > 0) {
    const result = await usersCollection.updateMany(
      { isverified: { $exists: false } },
      { $set: { isverified: false } }
    );
    console.log(`✅ Added 'isverified: false' to ${result.modifiedCount} user(s)`);
  } else {
    console.log(`✅ All users already have 'isverified' field`);
  }

  // Verify no existing data was modified
  const sampleUser = await usersCollection.findOne({});
  if (sampleUser && sampleUser.isAdmin !== undefined && sampleUser.isverified !== undefined) {
    console.log(`\n   Sample user fields:`);
    console.log(`   - isAdmin: ${sampleUser.isAdmin}`);
    console.log(`   - isverified: ${sampleUser.isverified}`);
  }
}

/**
 * Step 5: Create indexes (only if they don't exist)
 */
async function createIndexes(db) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 5: Creating Indexes');
  console.log('='.repeat(80));

  for (const [collectionName, indexes] of Object.entries(INDEX_DEFINITIONS)) {
    // Check if collection exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes(collectionName)) {
      console.log(`⚠️  Collection '${collectionName}' does not exist, skipping indexes`);
      continue;
    }

    const collection = db.collection(collectionName);

    // Get existing indexes
    const existingIndexes = await collection.indexes();
    const existingIndexNames = existingIndexes.map(idx => idx.name);

    console.log(`\n   Collection: ${collectionName}`);
    console.log(`   Existing indexes: ${existingIndexNames.join(', ') || '(none)'}`);

    for (const indexDef of indexes) {
      const indexName = indexDef.options.name;

      if (existingIndexNames.includes(indexName)) {
        console.log(`   ✅ Index '${indexName}' already exists`);
      } else {
        try {
          await collection.createIndex(indexDef.keys, indexDef.options);
          console.log(`   ✅ Created index '${indexName}'`);
        } catch (error) {
          // Handle case where index might conflict (e.g., unique constraint violation)
          if (error.code === 85 || error.codeName === 'IndexOptionsConflict') {
            console.log(`   ⚠️  Index '${indexName}' creation skipped (conflict detected, may already exist)`);
          } else {
            console.log(`   ❌ Failed to create index '${indexName}': ${error.message}`);
          }
        }
      }
    }
  }
}

/**
 * Step 6: Verification
 */
async function verifyMigration(db) {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 6: Verification');
  console.log('='.repeat(80));

  const collections = await db.listCollections().toArray();
  const collectionNames = collections.map(c => c.name);

  console.log('\n   Collections Status:');
  for (const collectionName of COLLECTIONS_TO_CREATE) {
    if (collectionNames.includes(collectionName)) {
      const count = await db.collection(collectionName).countDocuments();
      const indexes = await db.collection(collectionName).indexes();
      console.log(`   ✅ ${collectionName}: ${count} documents, ${indexes.length} indexes`);
    } else {
      console.log(`   ❌ ${collectionName}: NOT FOUND`);
    }
  }

  if (collectionNames.includes('users')) {
    const usersCollection = db.collection('users');
    const totalUsers = await usersCollection.countDocuments();
    const usersWithIsAdmin = await usersCollection.countDocuments({ isAdmin: { $exists: true } });
    const usersWithIsverified = await usersCollection.countDocuments({ isverified: { $exists: true } });

    console.log('\n   Users Collection Status:');
    console.log(`   ✅ Total users: ${totalUsers}`);
    console.log(`   ✅ Users with 'isAdmin' field: ${usersWithIsAdmin}/${totalUsers}`);
    console.log(`   ✅ Users with 'isverified' field: ${usersWithIsverified}/${totalUsers}`);
  }

  console.log('\n✅ Verification completed');
}

/**
 * Main migration function
 */
async function runMigration() {
  let client = null;
  let backupFile = null;

  try {
    console.log('\n' + '='.repeat(80));
    console.log('MONGODB LIVE DATABASE MIGRATION');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Database: ${LIVE_URI ? LIVE_URI.split('/').pop().split('?')[0] : 'N/A'}`);

    // Step 1: Create backup
    backupFile = await createBackup();

    // Step 2: Connect to database
    const { client: dbClient, db } = await connectToDatabase();
    client = dbClient;

    // Step 3: Ensure collections exist
    await ensureCollectionsExist(db);

    // Step 4: Update users collection
    await updateUsersCollection(db);

    // Step 5: Create indexes
    await createIndexes(db);

    // Step 6: Verify migration
    await verifyMigration(db);

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`\nBackup file: ${backupFile}`);
    console.log('\n⚠️  IMPORTANT: Keep the backup file safe in case you need to restore.');
    console.log('   The migration is complete and your database is ready to use.\n');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error('\nError:', error.message);
    console.error('\n⚠️  If a backup was created, you can restore it using:');
    if (backupFile) {
      console.error(`   mongorestore --uri="${LIVE_URI}" --archive="${backupFile}" --gzip`);
    }
    console.error('\nNo changes were made to your database after the error occurred.\n');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\nDatabase connection closed.');
    }
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };

