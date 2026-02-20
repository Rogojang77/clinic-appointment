import mongoose from 'mongoose'; 

const MONGO_URI  = process.env.MONGO_URI; 

if(!MONGO_URI){
    throw new Error("Please define MONGO_URI environment"); 
}

// Cache the connection promise to prevent multiple simultaneous connection attempts
let cachedPromise: Promise<typeof mongoose> | null = null;

async function dbConnect(): Promise<typeof mongoose> {
    // If already connected, return immediately without logging
    if(mongoose.connection.readyState === 1) {
        return mongoose;
    }

    // If connection is in progress, return the cached promise
    if(cachedPromise) {
        return cachedPromise;
    }

    // Create a new connection promise
    cachedPromise = mongoose.connect(MONGO_URI as string, {
        bufferCommands: false, // Disable mongoose buffering
        maxPoolSize: 10, // Maintain up to 10 socket connections
        serverSelectionTimeoutMS: 20000, // 20s for Docker cold start
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    }).then((mongoose) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log("DB is connected!");
        }
        return mongoose;
    }).catch((err) => {
        // Clear the cached promise on error so we can retry
        cachedPromise = null;
        console.error("DB connection error:", err);
        throw err;
    });

    return cachedPromise;
}

export default dbConnect; 