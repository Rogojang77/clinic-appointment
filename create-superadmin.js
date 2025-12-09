const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");

const uri =
  "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin";

async function createSuperAdmin() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection("users");

    // Customize the credentials before running
    const superAdmin = {
      email: "superadmin@policlinicamos.ro",
      username: "Super Admin",
      password: "admin123",
    };

    // hash password
    const hashedPassword = await bcrypt.hash(superAdmin.password, 10);
    superAdmin.password = hashedPassword;

    // add role and metadata
    superAdmin.accessSection = "all";
    superAdmin.role = "admin";  // Must be "admin" not "superadmin"
    superAdmin.isAdmin = true;  // This is the key flag for SuperAdmin
    superAdmin.isverified = true;  // Auto-verify SuperAdmin
    superAdmin.createdAt = new Date();
    superAdmin.updatedAt = new Date();
    superAdmin.__v = 0;

    await users.insertOne(superAdmin);
    console.log(`Super admin created: ${superAdmin.email}`);
  } catch (err) {
    console.error("Error creating super admin:", err);
  } finally {
    await client.close();
  }
}

createSuperAdmin();
