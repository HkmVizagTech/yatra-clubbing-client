import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'yatra';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function makeClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(MONGODB_URI);
  return client.connect();
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = makeClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = makeClientPromise();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export function isMongoConfigured(): boolean {
  return Boolean(MONGODB_URI);
}
