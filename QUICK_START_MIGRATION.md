# Quick Start: MongoDB Migration

## Before Running

1. **Set your MongoDB connection string:**
   ```bash
   export MONGO_URI="mongodb://moscrm:YOUR_PASSWORD@81.196.46.41:27017/clinicdb?authSource=admin"
   ```

2. **Ensure MongoDB tools are installed:**
   ```bash
   # Check if mongodump is available
   mongodump --version
   
   # If not installed, install it:
   # Ubuntu/Debian:
   sudo apt-get install mongodb-database-tools
   
   # macOS:
   brew install mongodb-database-tools
   ```

## Run Migration

```bash
node migrate-live-database.js
```

## What Happens

1. ✅ **Backup created** → `./mongo-backups/backup-YYYY-MM-DD-HH-MM-SS.archive.gz`
2. ✅ **Collections created** (if missing): `activityschedules`, `doctors`, `locations`, `sections`
3. ✅ **Users updated** (if needed): Adds `isAdmin: false` and `isverified: false` to users missing these fields
4. ✅ **Indexes created** based on your model definitions

## Restore Backup (if needed)

```bash
mongorestore --uri="YOUR_MONGO_URI" --archive="./mongo-backups/backup-YYYY-MM-DD-HH-MM-SS.archive.gz" --gzip
```

## Populate Collections from Test Database

After creating the collections, populate them with data from your test database:

```bash
node populate-from-test.js
```

This will:
- Create a backup before populating
- Copy data from test → live for: `activityschedules`, `doctors`, `locations`, `sections`
- Preserve relationships (ObjectIds)
- Skip duplicates safely

## Safety

- ✅ Never deletes or overwrites data
- ✅ Only adds missing fields/collections/indexes
- ✅ Creates backup before any changes
- ✅ Can be run multiple times safely

