import { environment, getActiveDatabaseUri } from "@bot/config";
import { connectDatabase } from "@bot/database";
import { DistributorPool } from "./DistributorPool.js";

const pool = new DistributorPool(environment.tokens.distributor);

export async function startDistributor() {
  const dbUri = getActiveDatabaseUri();
  await connectDatabase(dbUri, { provider: environment.databaseProvider });
  await pool.start();
}

export default pool;

if (process.argv[1]?.endsWith("apps/guard-distributor/src/index.js") || process.argv[1]?.endsWith("apps\\guard-distributor\\src\\index.js")) {
  startDistributor();
}
