import { load } from "cheerio";
import { randomUUID } from "crypto";
import { getDb } from "./drizzle/connect";
import { mossData } from "./drizzle/schema";
import { DB } from ".";

type MossData = {
  key: string;
  rank: number;
  website: string;
  publisher: string;
  reach: number;
  reachPercent: number;
  avgDailyReach: number;
  views: number;
  avgSessionDuration: string;
  trend: number;
};

function parseNumber(raw: string): number {
  const cleaned = raw
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

export async function fetchMossData(db: DB): Promise<void> {
  try {
    const providers = await db.query.newsProvider.findMany();

    const existingMossDataThisMonthRows = await db.query.mossData.findMany({
      where: (mossData, { gte, lt, and }) =>
        and(
          gte(
            mossData.createdAt,
            new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1,
            ).toISOString(),
          ),
          lt(
            mossData.createdAt,
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() + 1,
              1,
            ).toISOString(),
          ),
        ),
    });
    const existingProviderKeys = new Set(
      existingMossDataThisMonthRows.map((r) => r.providerKey),
    );

    const response = await fetch("https://www.moss-soz.si/rezultati/");
    const html = await response.text();

    const $ = load(html);

    const rows = $("#raziskavaTable tbody tr");
    const data: MossData[] = [];

    rows.each((_, row) => {
      const tds = $(row).find("td");
      if (tds.length < 10) return;

      const rank = parseNumber($(tds[0]).text().trim());
      const websiteAnchor = $(tds[2]).find("a");
      const websiteName = websiteAnchor.text().trim();

      const publisher = $(tds[3]).text().trim();
      const reach = parseNumber($(tds[4]).text());
      const reachPercent = parseNumber($(tds[5]).text());
      const views = parseNumber($(tds[6]).text());
      const avgDailyReach = parseNumber($(tds[7]).text());
      const avgSessionDuration = $(tds[8]).text().trim();
      const trend = parseNumber($(tds[9]).text());

      if (providers.some((p) => p.url.includes(websiteName))) {
        data.push({
          key: providers.find((p) => p.url.includes(websiteName))?.key || "",
          website: websiteName,
          publisher,
          reach,
          reachPercent,
          avgDailyReach,
          views,
          avgSessionDuration,
          trend,
          rank,
        });
      }
    });

    console.log(`Fetched MOSS data for ${data.length} providers`);
    console.log(data);

    if (
      data.filter((md) => {
        console.log(`record for ${md.key} alredy exist for this month`);
        return !existingProviderKeys.has(md.key);
      }).length === 0
    ) {
      console.log("No new MOSS data to insert for this month.");
      return;
    }
    await db.insert(mossData).values(
      data
        .filter((md) => {
          console.log(`record for ${md.key} alredy exist for this month`);
          return !existingProviderKeys.has(md.key);
        })
        .map((item) => {
          console.log(`inserting moss data for provider ${item.key}`);
          return {
            id: randomUUID(),
            createdAt: new Date().toISOString(),
            providerKey: item.key,
            website: item.website,
            publisher: item.publisher,
            reach: item.reach,
            reachPercent: item.reachPercent,
            avgDailyReach: item.avgDailyReach,
            views: item.views,
            avgSessionDuration: item.avgSessionDuration,
            trend: item.trend,
            rank: item.rank,
          };
        }),
    );
  } catch (error) {
    console.error("Error fetching MOSS data:", error);
  }
}
