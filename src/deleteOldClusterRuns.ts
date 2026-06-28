import { lt } from "drizzle-orm";
import { clusterRun } from "./drizzle/schema";
import { type DB } from "./index";

export async function deleteOldClusterRuns(db: DB) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 2);
  const cutoff = cutoffDate.toISOString();

  console.log(`Deleting cluster runs created before ${cutoff}`);

  const deletedRuns = await db
    .delete(clusterRun)
    .where(lt(clusterRun.createdAt, cutoff))
    .returning({ id: clusterRun.id });

  console.log(`Deleted ${deletedRuns.length} old cluster runs`);
}
