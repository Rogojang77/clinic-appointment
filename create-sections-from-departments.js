const { MongoClient } = require("mongodb");

// Import departments data directly
const departmentsData = [
  {
    name: "Cardiologie",
    doctors: [
      {
        name: "Dr Ciubuc Andrian",
        schedule: [{ day: "Sâmbătă", startTime: "09:00", endTime: "12:00" }],
      },
      {
        name: "Dr Ianoş Raluca",
        schedule: [{ day: "Sâmbătă", startTime: "09:00", endTime: "12:00" }],
      },
    ],
  },
  {
    name: "Chirurgie vasculară",
    doctors: [
      {
        name: "Dr Erno Jerzicska",
        schedule: [{ day: "Joi", startTime: "09:00", endTime: "12:00" }],
      },
      {
        name: "Dr Săsăran Vlad",
        schedule: [{ day: "Joi", startTime: "09:00", endTime: "12:00" }],
      },
    ],
  },
  {
    name: "Chirurgie pediatrică",
    doctors: [
      {
        name: "Dr Tchouala Tchakoute Paul",
        schedule: [{ day: "Marti", startTime: "16:00", endTime: "18:00" }],
      },
    ],
  },
  {
    name: "Dermatologie",
    doctors: [
      {
        name: "Dr Lisnic Vitalie",
        schedule: [{ day: "Sâmbătă", startTime: "09:00", endTime: "12:00" }],
      },
    ],
  },
  {
    name: "Endocrinologie",
    doctors: [
      {
        name: "Dr Pangaloș Roxana",
        schedule: [{ day: "Luni", startTime: "15:00", endTime: "17:00" }],
      },
      {
        name: "Dr Popa Emilia",
        schedule: [{ day: "Miercuri", startTime: "16:00", endTime: "18:00" }],
      },
    ],
  },
  {
    name: "Ginecologie",
    doctors: [
      {
        name: "Dr Groza Călin",
        schedule: [
          {
            day: "Miercuri",
            startTime: "15:00",
            endTime: "16:00",
          },
        ],
      },
      {
        name: "Dr Nechita Romocea Andreea",
        schedule: [
          {
            day: "Joi",
            startTime: "15:00",
            endTime: "16:00",
          },
        ],
      },
      {
        name: "Dr Popa Lucian",
        schedule: [
          {
            day: "Marti",
            startTime: "16:00",
            endTime: "18:00",
          },
        ],
      },
    ],
  },
  {
    name: "Nefrologie",
    doctors: [
      {
        name: "Dr Corba Lavinia",
        schedule: [
          {
            day: "Luni",
            startTime: "15:30",
            endTime: "17:30",
          },
        ],
      },
    ],
  },
  {
    name: "Neurologie",
    doctors: [
      {
        name: "Dr Alexander Cristian",
        schedule: [
          {
            day: "Luni",
            startTime: "16:00",
            endTime: "18:00",
          },
        ],
      },
      {
        name: "Dr Drăgan Liviu",
        schedule: [
          {
            day: "Joi",
            startTime: "15:00",
            endTime: "17:00",
          },
        ],
      },
    ],
  },
  {
    name: "Ortopedie – pediatrică",
    doctors: [
      {
        name: "Dr Bobşe Anca Raluca",
        schedule: [
          {
            day: "Joi",
            startTime: "10:00",
            endTime: "12:00",
          },
        ],
      },
    ],
  },
  {
    name: "Ortopedie – traumatologie",
    doctors: [
      {
        name: "Dr Boţ Robert",
        schedule: [
          {
            day: "Miercuri",
            startTime: "15:00",
            endTime: "17:00",
          },
        ],
      },
      {
        name: "Dr Bulzan Mădălin",
        schedule: [
          {
            day: "Marti",
            startTime: "15:00",
            endTime: "17:00",
          },
          {
            day: "Joi",
            startTime: "15:00",
            endTime: "17:00",
          },
        ],
      },
    ],
  },
  {
    name: "Pediatrie – neonatologie",
    doctors: [
      {
        name: "Dr Galiş Radu",
        schedule: [
          {
            day: "Sâmbătă",
            startTime: "09:00",
            endTime: "12:00",
          },
        ],
      },
      {
        name: "Dr Sabău Anca",
        schedule: [
          {
            day: "Luni",
            startTime: "15:00",
            endTime: "16:00",
          },
          {
            day: "Vineri",
            startTime: "15:00",
            endTime: "16:00",
          },
        ],
      },
    ],
  },
  {
    name: "Pneumologie",
    doctors: [
      {
        name: "Dr Vlaşin Lenuţa",
        schedule: [
          {
            day: "Vineri",
            startTime: "15:00",
            endTime: "17:00",
          },
        ],
      },
    ],
  },
  {
    name: "Psihiatrie",
    doctors: [
      {
        name: "Dr Tăut Mihai",
        schedule: [
          {
            day: "Miercuri",
            startTime: "16:00",
            endTime: "18:00",
          },
        ],
      },
    ],
  },
  {
    name: "Urologie",
    doctors: [
      {
        name: "Dr Jovrea Daniela",
        schedule: [
          {
            day: "Sâmbătă",
            startTime: "09:00",
            endTime: "12:00",
          },
        ],
      },
    ],
  },
];

const uri = "mongodb://moscrm:ClinicDB%40166091@81.196.46.41:27017/clinicdb_test?authSource=admin";

async function createSectionsFromDepartments() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const sections = db.collection("sections");

    console.log("Creating sections from departments...");

    // Clear existing sections first (dump the table)
    const deleteResult = await sections.deleteMany({});
    console.log(`Dumped existing sections table. Removed ${deleteResult.deletedCount} existing sections.`);

    // Create sections from departments
    const sectionsToCreate = departmentsData.map(department => ({
      name: department.name,
      description: `Medical department for ${department.name.toLowerCase()}`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Insert all sections
    const result = await sections.insertMany(sectionsToCreate);
    console.log(`Created ${result.insertedCount} sections from departments:`);

    departmentsData.forEach(dept => {
      console.log(`- ${dept.name}`);
    });

  } catch (err) {
    console.error("Error creating sections from departments:", err);
  } finally {
    await client.close();
  }
}

createSectionsFromDepartments();
