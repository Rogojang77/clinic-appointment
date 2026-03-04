import mongoose from 'mongoose';

// Support either MONGO_URI or (MONGO_HOST + MONGO_USER + MONGO_PASSWORD) so Docker can pass raw password
function getMongoUri(): string {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  const host = process.env.MONGO_HOST;
  const user = process.env.MONGO_USER;
  const password = process.env.MONGO_PASSWORD;
  if (host && user && password) {
    const encoded = encodeURIComponent(password);
    return `mongodb://${user}:${encoded}@${host}:27017/clinicdb?authSource=admin`;
  }
  throw new Error("Please define MONGO_URI or (MONGO_HOST, MONGO_USER, MONGO_PASSWORD)");
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

    // Resolve URI only when connecting (lazy), so build-time page collection doesn't require env
    const uri = getMongoUri();

    // Create a new connection promise
    cachedPromise = mongoose.connect(uri, {
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