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
    console.log("🚀 Cron job started at:", new Date().toISOString());

    const db = await getDb(env.HYPERDRIVE.connectionString);
    console.log("✅ Database connection established");

    const posts: Post[] = [];
    posts.push(...(await getRedditPosts()));

    const allLinks = posts.flatMap((post) => post.links);
    console.log(`🔗 Extracted ${allLinks.length} total links from posts`);

    const articles = await db.query.article.findMany({
      where: (article, { inArray }) => inArray(article.url, allLinks),
      columns: { id: true, url: true },
    });
    console.log(`📄 Found ${articles.length} matching articles in database`);

    const linkedPosts: (Post & { articleIds: number[] })[] = [];

    for (const post of posts) {
      const articleIds = articles
        .filter((article) => post.links.includes(article.url))
        .map((a) => a.id);
      if (articleIds.length > 0) {
        linkedPosts.push({ ...post, articleIds });
      }
    }
    console.log(`🔗 Created ${linkedPosts.length} posts with article links`);

    if (linkedPosts.length === 0) {
      console.log("⚠️ No linked posts found, skipping database inserts");
      console.log("✅ Cron job completed with no updates");
      return;
    }

    console.log(
      `💾 Inserting ${linkedPosts.length} social posts into database...`,
    );
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
    console.log(
      `✅ Inserted ${socialPosts.length} new social posts (${linkedPosts.length - socialPosts.length} duplicates skipped)`,
    );

    const connections = linkedPosts.flatMap((post) => {
      const socialPostId = socialPosts.find((sp) => sp.url === post.url)?.id;
      if (!socialPostId) return [];
      return post.articleIds.map((articleId) => ({
        socialPostId,
        articleId,
      }));
    });
    console.log(
      `🔗 Creating ${connections.length} article-social post connections...`,
    );

    if (connections.length > 0) {
      await db
        .insert(articleSocialPost)
        .values(connections)
        .onConflictDoNothing();
      console.log(`✅ Article-social post connections created`);
    } else {
      console.log(
        `⚠️ No new connections to create (all social posts already existed)`,
      );
    }

    console.log("🎉 Cron job completed successfully!");
    console.log(
      `📊 Summary: ${socialPosts.length} posts, ${connections.length} connections`,
    );
  },
};
