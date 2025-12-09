const mongoose = require('mongoose');

// Define schemas directly for migration
const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  isActive: { type: Boolean, default: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }]
}, { timestamps: true });

const DoctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  specialization: String,
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  schedule: [mongoose.Schema.Types.Mixed],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const LocationModel = mongoose.model('Location', LocationSchema);
const SectionModel = mongoose.model('Section', SectionSchema);
const DoctorModel = mongoose.model('Doctor', DoctorSchema);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinicdb?authSource=admin', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateLocations() {
  try {
    console.log('Starting location migration...');

    // Clear existing locations
    await LocationModel.deleteMany({});
    console.log('Cleared existing locations');

    // Create locations
    const locations = [
      { name: 'Beiuș', isActive: true },
      { name: 'Oradea', isActive: true }
    ];

    const createdLocations = await LocationModel.insertMany(locations);
    console.log(`Created ${createdLocations.length} locations`);

    // Find location IDs
    const beiusLocation = await LocationModel.findOne({ name: 'Beiuș' });
    const oradeaLocation = await LocationModel.findOne({ name: 'Oradea' });

    console.log('Beiuș location ID:', beiusLocation._id);
    console.log('Oradea location ID:', oradeaLocation._id);

    // Get all sections
    const sections = await SectionModel.find({});
    console.log(`Found ${sections.length} sections to update`);

    // Assign locations to sections
    for (const section of sections) {
      // Oradea gets only Ecografie, Beiuș gets all others
      const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;

      await SectionModel.findByIdAndUpdate(section._id, { locationId });
      console.log(`Updated section "${section.name}" to location: ${section.name === 'Ecografie' ? 'Oradea' : 'Beiuș'}`);
    }

    // Get all doctors
    const doctors = await DoctorModel.find({});
    console.log(`Found ${doctors.length} doctors to update`);

    // Assign locations to doctors based on their section
    for (const doctor of doctors) {
      const section = await SectionModel.findById(doctor.sectionId);
      if (section) {
        const locationId = section.name === 'Ecografie' ? oradeaLocation._id : beiusLocation._id;

        await DoctorModel.findByIdAndUpdate(doctor._id, { locationId });
        console.log(`Updated doctor "${doctor.name}" to location: ${section.name === 'Ecografie' ? 'Oradea' : 'Beiuș'}`);
      }
    }

    console.log('Location migration completed successfully!');

    // Verify the results
    console.log('\n=== VERIFICATION ===');
    const beiusSections = await SectionModel.find({ locationId: beiusLocation._id });
    const oradeaSections = await SectionModel.find({ locationId: oradeaLocation._id });

    console.log(`Beiuș sections (${beiusSections.length}):`, beiusSections.map(s => s.name));
    console.log(`Oradea sections (${oradeaSections.length}):`, oradeaSections.map(s => s.name));

    const beiusDoctors = await DoctorModel.find({ locationId: beiusLocation._id });
    const oradeaDoctors = await DoctorModel.find({ locationId: oradeaLocation._id });

    console.log(`Beiuș doctors: ${beiusDoctors.length}`);
    console.log(`Oradea doctors: ${oradeaDoctors.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrateLocations();
