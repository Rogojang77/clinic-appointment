require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error("Please define MONGO_URI environment");
}

async function dbConnect() {
    if (mongoose.connection.readyState !== 1) {
        try {
            await mongoose.connect(MONGO_URI);
            console.log("DB is connected!");
        } catch (err) {
            console.error("DB is not connected!", err);
        }
    } else {
        console.log("DB is already connected");
    }
}

module.exports = dbConnect;
