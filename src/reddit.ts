import { PlatformMetadata, Post } from "./linkSocialPostsToArticles";

const SUBREDDITS = [
  "slovenia",
  "slovenijafire",
  "ljubljana",
  "podlipo",
  "slovenskikoticek",
  "slovenija",
];

interface RedditPostData {
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  domain?: string;
  created_utc?: number;
  author?: string;
  score?: number;
  num_comments?: number;
  [key: string]: unknown;
}

/**
 * Extracts all URLs from text using a comprehensive regex pattern
 */
function extractUrlsFromText(text: string): string[] {
  if (!text) return [];

  // Regex pattern to match URLs including http(s), www, and other common URL formats
  const urlPattern =
    /(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)|www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*))/gi;

  const matches = text.match(urlPattern);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extracts links from a Reddit post from multiple sources
 */
function extractLinksFromPost(post: RedditPostData, subreddit: string): Post {
  const platformMetadata: PlatformMetadata = {
    title: post.title,
    subreddit,
    postedDate: new Date((post.created_utc || 0) * 1000),
    author: post.author,
  };

  const urls: string[] = [];

  // Extract from title
  const titleUrls = extractUrlsFromText(post.title);
  titleUrls.forEach((url) => {
    urls.push(url);
  });

  // Extract from description/selftext
  const descriptionUrls = extractUrlsFromText(post.selftext);
  descriptionUrls.forEach((url) => {
    urls.push(url);
  });

  // Extract the post URL if it's not a Reddit self-post and not already captured
  if (post.url && !post.url.includes("reddit.com")) {
    urls.push(post.url);
  }

  // Normalize URLs by removing trailing slashes and deduplicate
  const normalizedUrls = new Set(urls.map((url) => url.replace(/\/$/, "")));
  const normalizedLinks = Array.from(normalizedUrls).filter(
    (url) =>
      !url.startsWith("https://i.redd.it") &&
      !url.startsWith("https://v.redd.it") &&
      !url.startsWith("https://youtube.com") &&
      !url.startsWith("https://www.youtube.com") &&
      !url.startsWith("https://youtu.be") &&
      !url.startsWith("https://x.com"),
  );

  // Construct the full Reddit post URL from the permalink
  const redditPostUrl = `https://www.reddit.com${post.permalink}`;

  return {
    url: redditPostUrl,
    platform: "reddit" as const,
    postedAt: new Date((post.created_utc || 0) * 1000),
    platformMetadata,
    links: normalizedLinks,
  };
}

async function fetchSubredditPosts(subreddit: string): Promise<Post[]> {
  const response = await fetch(
    `https://www.reddit.com/r/${subreddit}/new.json`,
    { headers: { "User-Agent": "vidik-augment-cron/0.1" } },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch ${subreddit}: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    data: { children: Array<{ data: RedditPostData }> };
  };
  const posts = data.data.children.map((child) => child.data);

  return posts.map((post) => extractLinksFromPost(post, subreddit));
}

export async function linkRedditPosts(): Promise<Post[]> {
  const responses = await Promise.allSettled(
    SUBREDDITS.map((subreddit) => fetchSubredditPosts(subreddit)),
  );

  const successes = responses.filter((res) => res.status === "fulfilled");
  const failures = responses.filter((res) => res.status === "rejected");

  console.log(`Fetched ${successes.length} subreddits successfully.`);
  console.log(`Failed to fetch ${failures.length} subreddits.`);

  const allPosts: Post[] = [];
  successes.forEach((result) => {
    allPosts.push(...result.value);
  });

  failures.forEach((result, index) => {
    console.error(`Failed to fetch subreddit ${index}:`, result.reason);
  });

  const redditPosts = Array.from(
    new Map(allPosts.map((post) => [post.url, post])).values(),
  ).filter((post) => post.links.length > 0);

  console.log(`Extracted ${allPosts.length} total posts from Reddit`);
  console.log(
    `Extracted ${redditPosts.length} unique posts with links from Reddit`,
  );
  return redditPosts;
}
