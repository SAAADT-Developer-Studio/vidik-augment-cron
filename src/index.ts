import { getDb } from "./drizzle/connect";
import { linkSocialPostsToArticles } from "./linkSocialPostsToArticles";
import { fetchMossData } from "./moss";

export type DB = Awaited<ReturnType<typeof getDb>>;
export enum cronTriggers {
  linkSocialPosts = "*/10 * * * *",
  fetchMossData = "0 15 2 * *",
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const db = await getDb(env.HYPERDRIVE.connectionString);
    console.log("✅ Database connection established");

    if (controller.cron === cronTriggers.linkSocialPosts) {
      console.log(
        "Cron job linkSocialPosts started at:",
        new Date().toISOString(),
      );
      await linkSocialPostsToArticles(db);
    }

    if (controller.cron === cronTriggers.fetchMossData) {
      console.log(
        "Cron job fetchMossData started at:",
        new Date().toISOString(),
      );
      await fetchMossData(db);
    }
  },
};
