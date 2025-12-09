const seedTimeSlots = require('./timeslot');
const createUser = require('./User');

(async () => {
    console.log("Starting the database seeding process...");
    try {
        // await seedTimeSlots();
        // await createUser(); 
        console.log("Database seeding completed successfully.");
    } catch (error) {
        console.error("Error during database seeding:", error);
    }
})();
