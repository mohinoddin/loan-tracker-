import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, loansTable, paymentsTable } from "@workspace/db";
import {
  CreateLoanBody,
  UpdateLoanBody,
  GetLoanParams,
  UpdateLoanParams,
  DeleteLoanParams,
  ListLoansResponse,
  GetLoanResponse,
  CreateLoanResponse,
  UpdateLoanResponse,
  GetLoanSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * Calculate months elapsed between two dates (fractional).
 */
function monthsElapsed(startDate: string, asOf: Date = new Date()): number {
  const start = new Date(startDate);
  const diffMs = asOf.getTime() - start.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 30.4375));
}

/**
 * Simple interest: principal * rate/100 * months
 */
function calcInterest(principal: number, rateMonthly: number, months: number): number {
  return principal * (rateMonthly / 100) * months;
}

function buildLoanDetail(
  loan: typeof loansTable.$inferSelect,
  payments: (typeof paymentsTable.$inferSelect)[],
) {
  const principal = parseFloat(loan.principal);
  const rateMonthly = parseFloat(loan.interestRateMonthly);
  const months = monthsElapsed(loan.startDate);
  const totalInterestAccrued = calcInterest(principal, rateMonthly, months);

  const totalPrincipalPaid = payments.reduce((s, p) => s + parseFloat(p.principalPaid), 0);
  const totalInterestPaid = payments.reduce((s, p) => s + parseFloat(p.interestPaid), 0);
  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount), 0);

  const outstandingBalance = Math.max(
    0,
    principal + totalInterestAccrued - totalPaid,
  );

  return {
    id: loan.id,
    type: loan.type,
    personName: loan.personName,
    principal,
    interestRateMonthly: rateMonthly,
    startDate: loan.startDate,
    status: loan.status,
    notes: loan.notes ?? null,
    createdAt: loan.createdAt.toISOString(),
    totalInterestAccrued,
    totalPaid,
    totalPrincipalPaid,
    totalInterestPaid,
    outstandingBalance,
    monthsElapsed: months,
  };
}

// GET /loans
router.get("/loans", async (_req, res): Promise<void> => {
  const loans = await db.select().from(loansTable).orderBy(loansTable.createdAt);
  const result = loans.map((l) => ({
    id: l.id,
    type: l.type,
    personName: l.personName,
    principal: parseFloat(l.principal),
    interestRateMonthly: parseFloat(l.interestRateMonthly),
    startDate: l.startDate,
    status: l.status,
    notes: l.notes ?? null,
    createdAt: l.createdAt.toISOString(),
  }));
  res.json(ListLoansResponse.parse(result));
});

// GET /loans/summary — must come before /:id
router.get("/loans/summary", async (_req, res): Promise<void> => {
  const loans = await db.select().from(loansTable);
  const allPayments = await db.select().from(paymentsTable);

  const paymentsByLoan = new Map<number, typeof allPayments>();
  for (const p of allPayments) {
    if (!paymentsByLoan.has(p.loanId)) paymentsByLoan.set(p.loanId, []);
    paymentsByLoan.get(p.loanId)!.push(p);
  }

  let totalBorrowed = 0;
  let totalLent = 0;
  let totalBorrowedOutstanding = 0;
  let totalLentOutstanding = 0;
  let totalInterestOwed = 0;
  let totalInterestReceivable = 0;
  let activeLoansCount = 0;
  let closedLoansCount = 0;

  for (const loan of loans) {
    const payments = paymentsByLoan.get(loan.id) ?? [];
    const detail = buildLoanDetail(loan, payments);

    if (loan.status === "active") activeLoansCount++;
    else closedLoansCount++;

    if (loan.type === "borrowed") {
      totalBorrowed += detail.principal;
      totalBorrowedOutstanding += detail.outstandingBalance;
      totalInterestOwed += detail.totalInterestAccrued;
    } else {
      totalLent += detail.principal;
      totalLentOutstanding += detail.outstandingBalance;
      totalInterestReceivable += detail.totalInterestAccrued;
    }
  }

  res.json(
    GetLoanSummaryResponse.parse({
      totalBorrowed,
      totalLent,
      totalBorrowedOutstanding,
      totalLentOutstanding,
      activeLoansCount,
      closedLoansCount,
      totalInterestOwed,
      totalInterestReceivable,
    }),
  );
});

// GET /loans/:id
router.get("/loans/:id", async (req, res): Promise<void> => {
  const params = GetLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, params.data.id));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.loanId, loan.id))
    .orderBy(paymentsTable.paymentDate);

  res.json(GetLoanResponse.parse(buildLoanDetail(loan, payments)));
});

// POST /loans
router.post("/loans", async (req, res): Promise<void> => {
  const parsed = CreateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, personName, principal, interestRateMonthly, startDate, notes, status } = parsed.data;

  const [loan] = await db
    .insert(loansTable)
    .values({
      type,
      personName,
      principal: String(principal),
      interestRateMonthly: String(interestRateMonthly),
      startDate,
      notes: notes ?? null,
      status: status ?? "active",
    })
    .returning();

  res.status(201).json(
    CreateLoanResponse.parse({
      id: loan.id,
      type: loan.type,
      personName: loan.personName,
      principal: parseFloat(loan.principal),
      interestRateMonthly: parseFloat(loan.interestRateMonthly),
      startDate: loan.startDate,
      status: loan.status,
      notes: loan.notes ?? null,
      createdAt: loan.createdAt.toISOString(),
    }),
  );
});

// PATCH /loans/:id
router.patch("/loans/:id", async (req, res): Promise<void> => {
  const params = UpdateLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLoanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.personName !== undefined) updateData.personName = parsed.data.personName;
  if (parsed.data.principal !== undefined) updateData.principal = String(parsed.data.principal);
  if (parsed.data.interestRateMonthly !== undefined) updateData.interestRateMonthly = String(parsed.data.interestRateMonthly);
  if (parsed.data.startDate !== undefined) updateData.startDate = parsed.data.startDate;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [loan] = await db
    .update(loansTable)
    .set(updateData)
    .where(eq(loansTable.id, params.data.id))
    .returning();

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  res.json(
    UpdateLoanResponse.parse({
      id: loan.id,
      type: loan.type,
      personName: loan.personName,
      principal: parseFloat(loan.principal),
      interestRateMonthly: parseFloat(loan.interestRateMonthly),
      startDate: loan.startDate,
      status: loan.status,
      notes: loan.notes ?? null,
      createdAt: loan.createdAt.toISOString(),
    }),
  );
});

// DELETE /loans/:id
router.delete("/loans/:id", async (req, res): Promise<void> => {
  const params = DeleteLoanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [loan] = await db
    .delete(loansTable)
    .where(eq(loansTable.id, params.data.id))
    .returning();

  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
