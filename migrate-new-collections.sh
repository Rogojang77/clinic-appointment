#!/bin/bash

# Migration script to add new collections from test database to live database
# Collections to migrate: activityschedules, doctors, locations, sections
# Collections NOT to modify: locationschedules, colors, appointments, notes, users

TEST_URI="mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin"
LIVE_URI="mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb?authSource=admin"
TEMP_DIR="/tmp/migration_$(date +%Y%m%d_%H%M%S)"

# Collections to migrate
COLLECTIONS=("activityschedules" "doctors" "locations" "sections")

echo "Starting migration..."
echo "Collections to migrate: ${COLLECTIONS[@]}"
echo ""

# Create temporary directory
mkdir -p "$TEMP_DIR/clinicdb"

# Dump specific collections from test database
echo "Dumping collections from test database..."
for collection in "${COLLECTIONS[@]}"; do
  echo "  - Dumping $collection..."
  mongodump --uri="$TEST_URI" --collection="$collection" --out="$TEMP_DIR"
  # Move files to clinicdb directory for proper restore
  if [ -f "$TEMP_DIR/clinicdb_test/$collection.bson" ]; then
    mv "$TEMP_DIR/clinicdb_test/$collection.bson" "$TEMP_DIR/clinicdb/"
    [ -f "$TEMP_DIR/clinicdb_test/$collection.metadata.json" ] && mv "$TEMP_DIR/clinicdb_test/$collection.metadata.json" "$TEMP_DIR/clinicdb/"
  fi
done

# Restore to live database (without --drop to avoid modifying existing collections)
echo ""
echo "Restoring collections to live database..."
mongorestore --uri="$LIVE_URI" "$TEMP_DIR/clinicdb"

# Cleanup
echo ""
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo "Migration completed!"
echo ""
echo "Verifying collections in live database:"
mongosh "$LIVE_URI" --eval "db.getCollectionNames().forEach(function(collection) { print(collection + ': ' + db.getCollection(collection).countDocuments() + ' documents'); })"

