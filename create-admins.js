const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const uri = "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin";

async function createAdmins() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection("users");

    const newAdmins = [
      { email: "oradea@policlinicamos.ro", username: "Admin Oradea", password: "AlaBala123;" },
      { email: "eco@policlinicamos.ro", username: "Admin Eco", password: "AlaBala123;" },
    ];

    for (const admin of newAdmins) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      admin.password = hashedPassword;

      admin.accessSection = "all";
      admin.role = "admin";
      admin.createdAt = new Date();
      admin.updatedAt = new Date();
      admin.__v = 0;

      // Insert admin safely
      await users.insertOne(admin);
      console.log(`Created admin: ${admin.email}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

createAdmins();
