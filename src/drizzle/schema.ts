import {
  pgTable,
  index,
  serial,
  varchar,
  jsonb,
  boolean,
  timestamp,
  foreignKey,
  unique,
  integer,
  doublePrecision,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const clusterRun = pgTable(
  "cluster_run",
  {
    id: serial().primaryKey().notNull(),
    algoVersion: varchar("algo_version").notNull(),
    params: jsonb(),
    isProduction: boolean("is_production").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    index("ix_cluster_run_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops"),
    ),
  ],
);

export const articleCluster = pgTable(
  "article_cluster",
  {
    id: serial().primaryKey().notNull(),
    articleId: integer("article_id").notNull(),
    clusterId: integer("cluster_id").notNull(),
    runId: integer("run_id").notNull(),
  },
  (table) => [
    index("ix_article_cluster_cluster_id").using(
      "btree",
      table.clusterId.asc().nullsLast().op("int4_ops"),
    ),
    foreignKey({
      columns: [table.articleId],
      foreignColumns: [article.id],
      name: "article_cluster_article_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.clusterId],
      foreignColumns: [clusterV2.id],
      name: "article_cluster_cluster_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.runId],
      foreignColumns: [clusterRun.id],
      name: "article_cluster_run_id_fkey",
    }).onDelete("cascade"),
    unique("uq_article_cluster_run").on(
      table.articleId,
      table.clusterId,
      table.runId,
    ),
  ],
);

export const clusterV2 = pgTable(
  "cluster_v2",
  {
    id: serial().primaryKey().notNull(),
    title: varchar().notNull(),
    slug: varchar(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    runId: integer("run_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.runId],
      foreignColumns: [clusterRun.id],
      name: "cluster_v2_run_id_fkey",
    }).onDelete("cascade"),
    unique("cluster_v2_slug_key").on(table.slug),
  ],
);

export const article = pgTable(
  "article",
  {
    id: serial().primaryKey().notNull(),
    url: varchar().notNull(),
    title: varchar().notNull(),
    publishedAt: timestamp("published_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    deck: varchar(),
    author: varchar(),
    content: varchar(),
    embedding: doublePrecision().array().notNull(),
    newsProviderKey: varchar("news_provider_key").notNull(),
    summary: varchar(),
    clusterId: integer("cluster_id"),
    imageUrls: varchar("image_urls").array(),
    categories: varchar().array(),
    llmRank: integer("llm_rank"),
    isPaywalled: boolean("is_paywalled"),
  },
  (table) => [
    index("ix_article_published_at_news_provider_key").using(
      "btree",
      table.publishedAt.asc().nullsLast().op("text_ops"),
      table.newsProviderKey.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.clusterId],
      foreignColumns: [cluster.id],
      name: "article_cluster_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.newsProviderKey],
      foreignColumns: [newsProvider.key],
      name: "article_news_provider_key_fkey",
    }),
    unique("article_url_key").on(table.url),
  ],
);

export const newsProvider = pgTable(
  "news_provider",
  {
    key: varchar().primaryKey().notNull(),
    name: varchar().notNull(),
    url: varchar().notNull(),
    rank: integer().notNull(),
    biasRating: varchar("bias_rating"),
  },
  (table) => [
    unique("news_provider_name_key").on(table.name),
    unique("news_provider_url_key").on(table.url),
  ],
);

export const articleSocialPost = pgTable(
  "article_social_post",
  {
    id: serial().primaryKey().notNull(),
    articleId: integer("article_id").notNull(),
    socialPostId: integer("social_post_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.articleId],
      foreignColumns: [article.id],
      name: "article_social_post_article_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.socialPostId],
      foreignColumns: [socialPost.id],
      name: "article_social_post_social_post_id_fkey",
    }).onDelete("cascade"),
    unique("uq_article_social_post").on(table.articleId, table.socialPostId),
  ],
);

export const socialPost = pgTable(
  "social_post",
  {
    id: serial().primaryKey().notNull(),
    platform: varchar({ length: 6 }).notNull(),
    url: varchar().notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true, mode: "string" }),
    platformMetadata: jsonb("platform_metadata"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [unique("social_post_url_key").on(table.url)],
);

export const mossData = pgTable(
  "moss_data",
  {
    id: uuid().primaryKey().notNull(),
    providerKey: varchar("provider_key").notNull(),
    rank: integer().notNull(),
    website: varchar().notNull(),
    publisher: varchar().notNull(),
    reach: integer().notNull(),
    reachPercent: doublePrecision("reach_percent").notNull(),
    avgDailyReach: integer("avg_daily_reach").notNull(),
    views: integer().notNull(),
    avgSessionDuration: varchar("avg_session_duration").notNull(),
    trend: doublePrecision().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.providerKey],
      foreignColumns: [newsProvider.key],
      name: "moss_data_provider_key_fkey",
    }),
  ],
);

export const alembicVersion = pgTable("alembic_version", {
  versionNum: varchar("version_num", { length: 32 }).primaryKey().notNull(),
});

export const cluster = pgTable(
  "cluster",
  {
    id: serial().primaryKey().notNull(),
    title: varchar().notNull(),
    slug: varchar(),
  },
  (table) => [unique("cluster_slug_key").on(table.slug)],
);

export const vote = pgTable(
  "vote",
  {
    userId: uuid("user_id").notNull(),
    providerId: varchar("provider_id").notNull(),
    value: varchar().notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.providerId],
      foreignColumns: [newsProvider.key],
      name: "vote_provider_id_fkey",
    }),
    primaryKey({
      columns: [table.userId, table.providerId],
      name: "vote_pkey",
    }),
  ],
);
