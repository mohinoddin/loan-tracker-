import { pgTable, serial, text, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const loanTypeEnum = pgEnum("loan_type", ["borrowed", "lent"]);
export const loanStatusEnum = pgEnum("loan_status", ["active", "closed"]);

export const loansTable = pgTable("loans", {
  id: serial("id").primaryKey(),
  type: loanTypeEnum("type").notNull(),
  personName: text("person_name").notNull(),
  principal: numeric("principal", { precision: 15, scale: 2 }).notNull(),
  interestRateMonthly: numeric("interest_rate_monthly", { precision: 6, scale: 4 }).notNull().default("2"),
  startDate: date("start_date").notNull(),
  status: loanStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoanSchema = createInsertSchema(loansTable).omit({ id: true, createdAt: true });
export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loansTable.$inferSelect;
