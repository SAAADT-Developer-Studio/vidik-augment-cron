import { relations } from "drizzle-orm/relations";
import { article, articleCluster, clusterV2, clusterRun, cluster, newsProvider, articleSocialPost, socialPost, mossData, vote } from "./schema";

export const articleClusterRelations = relations(articleCluster, ({one}) => ({
	article: one(article, {
		fields: [articleCluster.articleId],
		references: [article.id]
	}),
	clusterV2: one(clusterV2, {
		fields: [articleCluster.clusterId],
		references: [clusterV2.id]
	}),
	clusterRun: one(clusterRun, {
		fields: [articleCluster.runId],
		references: [clusterRun.id]
	}),
}));

export const articleRelations = relations(article, ({one, many}) => ({
	articleClusters: many(articleCluster),
	cluster: one(cluster, {
		fields: [article.clusterId],
		references: [cluster.id]
	}),
	newsProvider: one(newsProvider, {
		fields: [article.newsProviderKey],
		references: [newsProvider.key]
	}),
	articleSocialPosts: many(articleSocialPost),
}));

export const clusterV2Relations = relations(clusterV2, ({one, many}) => ({
	articleClusters: many(articleCluster),
	clusterRun: one(clusterRun, {
		fields: [clusterV2.runId],
		references: [clusterRun.id]
	}),
}));

export const clusterRunRelations = relations(clusterRun, ({many}) => ({
	articleClusters: many(articleCluster),
	clusterV2s: many(clusterV2),
}));

export const clusterRelations = relations(cluster, ({many}) => ({
	articles: many(article),
}));

export const newsProviderRelations = relations(newsProvider, ({many}) => ({
	articles: many(article),
	mossData: many(mossData),
	votes: many(vote),
}));

export const articleSocialPostRelations = relations(articleSocialPost, ({one}) => ({
	article: one(article, {
		fields: [articleSocialPost.articleId],
		references: [article.id]
	}),
	socialPost: one(socialPost, {
		fields: [articleSocialPost.socialPostId],
		references: [socialPost.id]
	}),
}));

export const socialPostRelations = relations(socialPost, ({many}) => ({
	articleSocialPosts: many(articleSocialPost),
}));

export const mossDataRelations = relations(mossData, ({one}) => ({
	newsProvider: one(newsProvider, {
		fields: [mossData.providerKey],
		references: [newsProvider.key]
	}),
}));

export const voteRelations = relations(vote, ({one}) => ({
	newsProvider: one(newsProvider, {
		fields: [vote.providerId],
		references: [newsProvider.key]
	}),
}));