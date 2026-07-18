import { pgTable, serial, integer, numeric, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { loansTable } from "./loans";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loansTable.id, { onDelete: "cascade" }),
  paymentDate: date("payment_date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  principalPaid: numeric("principal_paid", { precision: 15, scale: 2 }).notNull(),
  interestPaid: numeric("interest_paid", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
