import { url } from "inspector";
import { getDb } from "./drizzle/connect";
import { articleSocialPost, socialPost } from "./drizzle/schema";
import { linkRedditPosts as getRedditPosts } from "./reddit";

export type Platform = "reddit" | "twitter"; // or other things

export interface PlatformMetadata {
  title: string;
  subreddit: string;
  postedDate: Date;
  author?: string;
}

export type Post = {
  url: string;
  platform: Platform;
  postedAt: Date;
  platformMetadata: PlatformMetadata;
  links: string[];
};

export default {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
    const db = await getDb(env.HYPERDRIVE.connectionString);
    const posts: Post[] = [];
    posts.push(...(await getRedditPosts()));

    const allLinks = posts.flatMap((post) => post.links);

    const articles = await db.query.article.findMany({
      where: (article, { inArray }) => inArray(article.url, allLinks),
      columns: { id: true, url: true },
    });

    const linkedPosts: (Post & { articleIds: number[] })[] = [];

    for (const post of posts) {
      const articleIds = articles
        .filter((article) => post.links.includes(article.url))
        .map((a) => a.id);
      if (articleIds.length > 0) {
        linkedPosts.push({ ...post, articleIds });
      }
    }

    const socialPosts = await db
      .insert(socialPost)
      .values(
        linkedPosts.map((post) => {
          return {
            platform: post.platform,
            url: post.url,
            postedAt: post.postedAt.toISOString(),
            createdAt: new Date().toISOString(),
            platformMetadata: JSON.stringify(post.platformMetadata),
          };
        }),
      )
      .onConflictDoNothing() // Add conflict handling for unique url
      .returning({ id: socialPost.id, url: socialPost.url });

    const connections = linkedPosts.flatMap((post) => {
      const socialPostId = socialPosts.find((sp) => sp.url === post.url)?.id;
      if (!socialPostId) return [];
      return post.articleIds.map((articleId) => ({
        socialPostId,
        articleId,
      }));
    });

    await db
      .insert(articleSocialPost)
      .values(connections)
      .onConflictDoNothing();

    console.log("Cron processed!");
  },
};
