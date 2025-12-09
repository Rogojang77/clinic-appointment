# MongoDB Live Database Migration Script

## Overview

This script safely migrates your live MongoDB database by:
1. Creating a full backup (data + indexes)
2. Creating collections if they don't exist: `activityschedules`, `doctors`, `locations`, `sections`
3. Adding new fields to `users` collection only if they don't exist: `isAdmin` (default: false), `isverified` (default: false)
4. Creating indexes based on model definitions

## Safety Features

✅ **Never deletes, drops, or overwrites existing data**
✅ **Only adds fields that don't exist**
✅ **Only creates collections that don't exist**
✅ **Only creates indexes that don't exist**
✅ **Creates a full backup before making any changes**

## Prerequisites

1. **Node.js** (v14 or higher)
2. **MongoDB Tools** (mongodump) - Required for backup
   - Install from: https://www.mongodb.com/try/download/database-tools
   - Or via package manager:
     - Ubuntu/Debian: `sudo apt-get install mongodb-database-tools`
     - macOS: `brew install mongodb-database-tools`
     - Windows: Download from MongoDB website

3. **Environment Variables**
   - `MONGO_URI` - MongoDB connection string for live database
   - `BACKUP_DIR` (optional) - Directory for backups (default: `./mongo-backups`)

## Setup

1. **Set your MongoDB connection string:**
   ```bash
   export MONGO_URI="mongodb://username:password@host:port/database?authSource=admin"
   ```
   
   Or create a `.env` file:
   ```
   MONGO_URI=mongodb://username:password@host:port/database?authSource=admin
   BACKUP_DIR=./mongo-backups
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

## Usage

### Run the migration:

```bash
node migrate-live-database.js
```

Or if made executable:

```bash
./migrate-live-database.js
```

### What the script does:

1. **Creates Backup**
   - Uses `mongodump` to create a compressed archive
   - Includes all data and indexes
   - Saves to `BACKUP_DIR/backup-YYYY-MM-DD-HH-MM-SS.archive.gz`

2. **Creates Collections** (if they don't exist)
   - `activityschedules`
   - `doctors`
   - `locations`
   - `sections`

3. **Updates Users Collection**
   - Adds `isAdmin: false` to users missing this field
   - Adds `isverified: false` to users missing this field
   - **Does NOT modify existing values**

4. **Creates Indexes**
   - `activityschedules`: `{ userId: 1, sectionId: 1 }` (unique)
   - `doctors`: `{ sectionId: 1 }`, `{ name: 1 }`, `{ email: 1 }`
   - `locations`: `{ name: 1 }`
   - `sections`: `{ name: 1 }` (unique)
   - `users`: `{ email: 1 }` (unique)

## Restore from Backup

If you need to restore the database from backup:

```bash
mongorestore --uri="YOUR_MONGO_URI" --archive="path/to/backup-YYYY-MM-DD-HH-MM-SS.archive.gz" --gzip
```

## Verification

After running the migration, the script will:
- Show all collections and their document counts
- Verify that new fields were added to users
- List all indexes created
- Display verification summary

## Troubleshooting

### Error: "mongodump: command not found"
- Install MongoDB Database Tools (see Prerequisites)

### Error: "MONGO_URI environment variable is not set"
- Set the `MONGO_URI` environment variable or add it to `.env` file

### Error: "Authentication failed"
- Check your MongoDB credentials in the connection string
- Ensure the user has read/write permissions

### Error: "Index creation failed"
- The script will continue even if some indexes fail (they may already exist)
- Check the output for specific error messages

## Index Definitions

The script creates the following indexes based on your model definitions:

### activityschedules
- `userId_1_sectionId_1`: Unique compound index on `{ userId: 1, sectionId: 1 }`

### doctors
- `sectionId_1`: Index on `sectionId` field
- `name_1`: Index on `name` field
- `email_1`: Index on `email` field

### locations
- `name_1`: Index on `name` field

### sections
- `name_1`: Unique index on `name` field

### users
- `email_1`: Unique index on `email` field

## Notes

- The script is **idempotent** - you can run it multiple times safely
- Existing data is **never modified** - only new fields are added with default values
- Collections are created empty if they don't exist
- The script will skip operations that have already been completed

## Populating Collections from Test Database

After running the initial migration script, you can populate the new collections with data from your test database using:

```bash
node populate-from-test.js
```

This script will:
1. Create a backup of the live database
2. Copy data from test database collections: `activityschedules`, `doctors`, `locations`, `sections`
3. Preserve ObjectIds to maintain relationships
4. Skip duplicates (won't overwrite existing data)
5. Migrate in correct order: locations → sections → doctors → activityschedules

**Note:** Make sure `MONGO_URI` is set to your live database connection string. The test database URI is configured in the script or can be set via `MONGO_URI_TEST` environment variable.

## Support

If you encounter any issues:
1. Check the error messages in the console output
2. Verify your MongoDB connection string
3. Ensure you have proper permissions
4. Check that MongoDB tools are installed correctly

