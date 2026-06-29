import { MongoClient, Db } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB || 'yatra';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

// Reuse the client across requests within the same serverless instance (warm invocations).
// In production we still use the global to survive module re-evaluation within the same process.
function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    global._mongoClientPromise = client.connect();
  }

  return global._mongoClientPromise;
}

let _indexesEnsured = false;

async function ensureIndexes(db: Db) {
  if (_indexesEnsured) return;
  _indexesEnsured = true;
  const col = db.collection('registrations');
  await Promise.all([
    col.createIndex({ created_at: -1 }),
    col.createIndex({ payment_status: 1 }),
    col.createIndex({ ref: 1 }, { unique: true }),
    col.createIndex({ student_id_status: 1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db(DB_NAME);
  ensureIndexes(db).catch(() => {}); // fire-and-forget; never blocks a request
  return db;
}

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}
