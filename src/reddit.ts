import { PlatformMetadata, Post } from ".";

const SUBREDDITS = [
  "slovenia",
  "slovenijafire",
  "ljubljana",
  "podlipo",
  "slovenskikoticek",
  "slovenija",
];

// Reddit blocks unauthenticated .json requests, but the Atom feeds are still public.
// Anonymous feeds allow roughly one request per minute, so all subreddits are fetched
// as a single multireddit feed (/r/a+b+c), where each entry is labelled with its subreddit.
const FEED_URL = `https://www.reddit.com/r/${SUBREDDITS.join("+")}/new/.rss?limit=100`;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

interface RedditFeedEntry {
  title: string;
  subreddit: string;
  permalink: string;
  url: string; // where the post points to (the permalink for text posts)
  bodyHtml: string;
  publishedAt: Date;
  author?: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Decodes XML/HTML entities (&amp;, &quot;, &#39;, &#x27;, ...)
 */
function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (_, entity: string) => {
      const lower = entity.toLowerCase();
      if (lower.startsWith("#x"))
        return String.fromCodePoint(parseInt(lower.slice(2), 16));
      if (lower.startsWith("#"))
        return String.fromCodePoint(Number(lower.slice(1)));
      return NAMED_ENTITIES[lower];
    },
  );
}

function getTag(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1];
}

/**
 * Parses the entries of a subreddit's Atom feed
 */
function parseFeed(xml: string): RedditFeedEntry[] {
  const entries = xml.split("<entry>").slice(1);

  return entries.map((entry) => {
    const permalink = entry.match(/<link href="([^"]+)"/)?.[1] ?? "";
    // The content is escaped HTML with a "[link]" anchor pointing to the post's target
    const contentHtml = decodeEntities(getTag(entry, "content") ?? "");
    const url =
      contentHtml.match(/<a href="([^"]+)">\[link\]<\/a>/)?.[1] ?? permalink;
    const bodyHtml =
      contentHtml.match(/<!-- SC_OFF -->([\s\S]*?)<!-- SC_ON -->/)?.[1] ?? "";
    const author = getTag(getTag(entry, "author") ?? "", "name")?.replace(
      /^\/u\//,
      "",
    );

    return {
      title: decodeEntities(getTag(entry, "title") ?? ""),
      subreddit: (
        entry.match(/<category term="([^"]+)"/)?.[1] ?? ""
      ).toLowerCase(),
      permalink: decodeEntities(permalink),
      url: decodeEntities(url),
      bodyHtml,
      publishedAt: new Date(getTag(entry, "published") ?? 0),
      author,
    };
  });
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
 * Extracts links from the body HTML of a post: anchor hrefs and any plain-text URLs
 */
function extractUrlsFromHtml(html: string): string[] {
  const hrefs = [...html.matchAll(/<a href="([^"]+)"/g)].map((m) =>
    decodeEntities(m[1]),
  );
  const text = decodeEntities(html.replace(/<[^>]+>/g, " "));
  return [...hrefs, ...extractUrlsFromText(text)];
}

/**
 * Extracts links from a Reddit post from multiple sources
 */
function extractLinksFromPost(post: RedditFeedEntry): Post {
  const platformMetadata: PlatformMetadata = {
    title: post.title,
    subreddit: post.subreddit,
    postedDate: post.publishedAt,
    author: post.author,
  };

  const urls: string[] = [];

  // Extract from title
  urls.push(...extractUrlsFromText(post.title));

  // Extract from description/selftext
  urls.push(...extractUrlsFromHtml(post.bodyHtml));

  // Extract the post URL if it's not a Reddit self-post and not already captured
  if (post.url && !post.url.includes("reddit.com")) {
    urls.push(post.url);
  }

  // Normalize URLs by removing trailing slashes and deduplicate
  const normalizedUrls = new Set(urls.map((url) => url.replace(/\/$/, "")));
  const normalizedLinks = Array.from(normalizedUrls).filter(
    (url) =>
      url.startsWith("http") &&
      !url.includes("reddit.com") &&
      !url.startsWith("https://i.redd.it") &&
      !url.startsWith("https://v.redd.it") &&
      !url.startsWith("https://youtube.com") &&
      !url.startsWith("https://www.youtube.com") &&
      !url.startsWith("https://youtu.be") &&
      !url.startsWith("https://x.com"),
  );

  return {
    url: post.permalink,
    platform: "reddit" as const,
    postedAt: post.publishedAt,
    platformMetadata,
    links: normalizedLinks,
  };
}

export async function linkRedditPosts(): Promise<Post[]> {
  const response = await fetch(FEED_URL, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    console.error(
      `Failed to fetch Reddit feed: ${response.status} ${response.statusText}`,
    );
    return [];
  }

  const allPosts = parseFeed(await response.text()).map(extractLinksFromPost);

  const redditPosts = Array.from(
    new Map(allPosts.map((post) => [post.url, post])).values(),
  ).filter((post) => post.links.length > 0);

  console.log(`Extracted ${allPosts.length} total posts from Reddit`);
  console.log(
    `Extracted ${redditPosts.length} unique posts with links from Reddit`,
  );
  return redditPosts;
}
