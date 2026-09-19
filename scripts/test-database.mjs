import { MongoMemoryServer } from 'mongodb-memory-server';
import path from 'node:path';
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve('.system_generated/mongodb-binaries');
const server = await MongoMemoryServer.create({ instance: { ip: '127.0.0.1', port: 27017, dbPath: path.resolve('.system_generated/mongo-data'), dbName: 'public-bot-ecosystem' } });
console.log('MongoDB test server ready on 127.0.0.1:27017');
async function stop() { await server.stop(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
