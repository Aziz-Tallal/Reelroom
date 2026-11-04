import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trailerReviewsTable = pgTable("trailer_context_reviews", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTrailerReviewSchema = createInsertSchema(trailerReviewsTable).omit({ reviewedAt: true });
export type InsertTrailerReview = z.infer<typeof insertTrailerReviewSchema>;
export type TrailerReview = typeof trailerReviewsTable.$inferSelect;
