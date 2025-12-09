const { MongoClient } = require("mongodb");

const TEST_URI = "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin";
const LIVE_URI = "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb?authSource=admin";

// Collections to check
const COLLECTIONS_TO_CHECK = ["appointments", "doctors", "locations", "sections", "activityschedules"];

function getFieldNames(doc) {
  if (!doc) return [];
  return Object.keys(doc).filter(key => !key.startsWith('_'));
}

function analyzeSchema(docs) {
  const schema = {};
  docs.forEach(doc => {
    Object.keys(doc).forEach(key => {
      if (!key.startsWith('_')) {
        if (!schema[key]) {
          schema[key] = {
            type: typeof doc[key],
            isArray: Array.isArray(doc[key]),
            isObject: typeof doc[key] === 'object' && doc[key] !== null && !Array.isArray(doc[key]) && !(doc[key] instanceof Date),
            isObjectId: doc[key] && doc[key].constructor && doc[key].constructor.name === 'ObjectId',
            sample: doc[key]
          };
        }
      }
    });
  });
  return schema;
}

async function checkSchemas() {
  const testClient = new MongoClient(TEST_URI);
  const liveClient = new MongoClient(LIVE_URI);

  try {
    console.log("Connecting to databases...\n");
    await testClient.connect();
    await liveClient.connect();
    
    const testDb = testClient.db();
    const liveDb = liveClient.db();

    console.log("=".repeat(80));
    console.log("SCHEMA COMPARISON: TEST vs LIVE DATABASE");
    console.log("=".repeat(80));
    console.log("");

    for (const collectionName of COLLECTIONS_TO_CHECK) {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`COLLECTION: ${collectionName.toUpperCase()}`);
      console.log("=".repeat(80));

      try {
        const testCollection = testDb.collection(collectionName);
        const liveCollection = liveDb.collection(collectionName);

        const testCount = await testCollection.countDocuments();
        const liveCount = await liveCollection.countDocuments();

        console.log(`\nDocument counts:`);
        console.log(`  Test DB:  ${testCount} documents`);
        console.log(`  Live DB:  ${liveCount} documents`);

        // Get sample documents
        const testDocs = await testCollection.find({}).limit(5).toArray();
        const liveDocs = liveCollection ? await liveCollection.find({}).limit(5).toArray() : [];

        if (testDocs.length > 0) {
          console.log(`\n📋 TEST DATABASE SCHEMA:`);
          const testSchema = analyzeSchema(testDocs);
          Object.keys(testSchema).sort().forEach(field => {
            const info = testSchema[field];
            let typeInfo = info.type;
            if (info.isObjectId) typeInfo = 'ObjectId';
            else if (info.isArray) typeInfo = 'Array';
            else if (info.isObject) typeInfo = 'Object';
            else if (info.sample instanceof Date) typeInfo = 'Date';
            
            const sample = info.isObjectId ? 'ObjectId(...)' : 
                          info.isArray ? `[${info.sample.length} items]` :
                          info.isObject ? '{...}' :
                          info.sample instanceof Date ? info.sample.toISOString() :
                          String(info.sample).substring(0, 50);
            
            console.log(`  • ${field}: ${typeInfo} (sample: ${sample})`);
          });

          // Check for relation fields
          const relationFields = Object.keys(testSchema).filter(f => 
            f.toLowerCase().endsWith('id') || 
            f.toLowerCase().endsWith('ids') ||
            testSchema[f].isObjectId
          );
          if (relationFields.length > 0) {
            console.log(`\n🔗 RELATION FIELDS:`);
            relationFields.forEach(field => {
              console.log(`  • ${field} (${testSchema[field].isObjectId ? 'ObjectId reference' : 'potential relation'})`);
            });
          }
        }

        if (liveDocs.length > 0) {
          console.log(`\n📋 LIVE DATABASE SCHEMA:`);
          const liveSchema = analyzeSchema(liveDocs);
          Object.keys(liveSchema).sort().forEach(field => {
            const info = liveSchema[field];
            let typeInfo = info.type;
            if (info.isObjectId) typeInfo = 'ObjectId';
            else if (info.isArray) typeInfo = 'Array';
            else if (info.isObject) typeInfo = 'Object';
            else if (info.sample instanceof Date) typeInfo = 'Date';
            
            const sample = info.isObjectId ? 'ObjectId(...)' : 
                          info.isArray ? `[${info.sample.length} items]` :
                          info.isObject ? '{...}' :
                          info.sample instanceof Date ? info.sample.toISOString() :
                          String(info.sample).substring(0, 50);
            
            console.log(`  • ${field}: ${typeInfo} (sample: ${sample})`);
          });
        } else {
          console.log(`\n⚠️  Collection does not exist in LIVE database yet`);
        }

        // Check appointments for relation fields
        if (collectionName === 'appointments') {
          console.log(`\n🔍 CHECKING APPOINTMENT RELATIONS:`);
          const appointmentsWithDoctorId = await testCollection.countDocuments({ doctorId: { $exists: true } });
          const appointmentsWithSectionId = await testCollection.countDocuments({ sectionId: { $exists: true } });
          console.log(`  Appointments with doctorId: ${appointmentsWithDoctorId}/${testCount}`);
          console.log(`  Appointments with sectionId: ${appointmentsWithSectionId}/${testCount}`);
        }

        // Check doctors for locationId
        if (collectionName === 'doctors') {
          console.log(`\n🔍 CHECKING DOCTOR RELATIONS:`);
          const doctorsWithLocationId = await testCollection.countDocuments({ locationId: { $exists: true } });
          const doctorsWithSectionId = await testCollection.countDocuments({ sectionId: { $exists: true } });
          console.log(`  Doctors with locationId: ${doctorsWithLocationId}/${testCount}`);
          console.log(`  Doctors with sectionId: ${doctorsWithSectionId}/${testCount}`);
        }

        // Check sections for locationId
        if (collectionName === 'sections') {
          console.log(`\n🔍 CHECKING SECTION RELATIONS:`);
          const sectionsWithLocationId = await testCollection.countDocuments({ locationId: { $exists: true } });
          console.log(`  Sections with locationId: ${sectionsWithLocationId}/${testCount}`);
        }

      } catch (error) {
        console.error(`  ❌ Error checking ${collectionName}:`, error.message);
      }
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("SCHEMA CHECK COMPLETED");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("Schema check failed:", error);
    process.exit(1);
  } finally {
    await testClient.close();
    await liveClient.close();
  }
}

checkSchemas();

