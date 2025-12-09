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

// Day mapping from Romanian to English
const dayMapping = {
  'Luni': 'Monday',
  'Marti': 'Tuesday',
  'Miercuri': 'Wednesday',
  'Joi': 'Thursday',
  'Vineri': 'Friday',
  'Sâmbătă': 'Saturday',
  'Duminică': 'Sunday'
};

async function migrateDoctorsFromDepartments() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const sections = db.collection("sections");
    const doctors = db.collection("doctors");

    console.log("Starting migration of doctors from departments...");

    // First, create sections if they don't exist
    const existingSections = await sections.find({}).toArray();

    if (existingSections.length === 0) {
      console.log("No sections found. Creating sections from departments first...");

      const sectionsToCreate = departmentsData.map(department => ({
        name: department.name,
        description: `Medical department for ${department.name.toLowerCase()}`,
        isActive: true,
        doctors: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const sectionResult = await sections.insertMany(sectionsToCreate);
      console.log(`Created ${sectionResult.insertedCount} sections`);
    }

    // Get all sections for mapping
    const allSections = await sections.find({}).toArray();
    const sectionMap = {};
    allSections.forEach(section => {
      sectionMap[section.name] = section._id;
    });

    // Clear existing doctors
    await doctors.deleteMany({});
    console.log("Cleared existing doctors");

    let totalDoctorsCreated = 0;

    // Create doctors for each department
    for (const department of departmentsData) {
      const sectionId = sectionMap[department.name];

      if (!sectionId) {
        console.warn(`Section not found for department: ${department.name}`);
        continue;
      }

      console.log(`\nProcessing department: ${department.name}`);

      for (const doctorData of department.doctors) {
        // Convert schedule to the new format
        const convertedSchedule = [];

        // Create a schedule for each day of the week
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        daysOfWeek.forEach(day => {
          const isWorkingDay = doctorData.schedule.some(sched => dayMapping[sched.day] === day);

          if (isWorkingDay) {
            const daySchedules = doctorData.schedule.filter(sched => dayMapping[sched.day] === day);
            const timeSlots = daySchedules.map(sched => ({
              startTime: sched.startTime,
              endTime: sched.endTime,
              isAvailable: true
            }));

            convertedSchedule.push({
              day: day,
              timeSlots: timeSlots,
              isWorkingDay: true
            });
          } else {
            convertedSchedule.push({
              day: day,
              timeSlots: [],
              isWorkingDay: false
            });
          }
        });

        const doctor = {
          name: doctorData.name,
          email: null,
          phone: null,
          specialization: department.name,
          sectionId: sectionId,
          schedule: convertedSchedule,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await doctors.insertOne(doctor);
        console.log(`  Created doctor: ${doctorData.name}`);
        totalDoctorsCreated++;

        // Add doctor to section's doctors array
        await sections.updateOne(
          { _id: sectionId },
          { $addToSet: { doctors: doctor._id } }
        );
      }
    }

    console.log(`\nMigration completed successfully!`);
    console.log(`Total doctors created: ${totalDoctorsCreated}`);
    console.log(`Total sections: ${allSections.length}`);

  } catch (err) {
    console.error("Error during migration:", err);
  } finally {
    await client.close();
  }
}

migrateDoctorsFromDepartments();
