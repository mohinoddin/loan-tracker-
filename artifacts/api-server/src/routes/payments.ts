import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, paymentsTable, loansTable } from "@workspace/db";
import {
  ListPaymentsParams,
  ListPaymentsResponse,
  CreatePaymentParams,
  CreatePaymentBody,
  CreatePaymentResponse,
  DeletePaymentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /loans/:id/payments
router.get("/loans/:id/payments", async (req, res): Promise<void> => {
  const params = ListPaymentsParams.safeParse(req.params);
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
    .where(eq(paymentsTable.loanId, params.data.id))
    .orderBy(paymentsTable.paymentDate);

  const result = payments.map((p) => ({
    id: p.id,
    loanId: p.loanId,
    paymentDate: p.paymentDate,
    amount: parseFloat(p.amount),
    principalPaid: parseFloat(p.principalPaid),
    interestPaid: parseFloat(p.interestPaid),
    notes: p.notes ?? null,
    createdAt: p.createdAt.toISOString(),
  }));

  res.json(ListPaymentsResponse.parse(result));
});

// POST /loans/:id/payments
router.post("/loans/:id/payments", async (req, res): Promise<void> => {
  const params = CreatePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [loan] = await db.select().from(loansTable).where(eq(loansTable.id, params.data.id));
  if (!loan) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }

  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { paymentDate, amount, principalPaid, interestPaid, notes } = parsed.data;

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      loanId: params.data.id,
      paymentDate,
      amount: String(amount),
      principalPaid: String(principalPaid),
      interestPaid: String(interestPaid),
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(
    CreatePaymentResponse.parse({
      id: payment.id,
      loanId: payment.loanId,
      paymentDate: payment.paymentDate,
      amount: parseFloat(payment.amount),
      principalPaid: parseFloat(payment.principalPaid),
      interestPaid: parseFloat(payment.interestPaid),
      notes: payment.notes ?? null,
      createdAt: payment.createdAt.toISOString(),
    }),
  );
});

// DELETE /loans/:id/payments/:paymentId
router.delete("/loans/:id/payments/:paymentId", async (req, res): Promise<void> => {
  const params = DeletePaymentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [payment] = await db
    .delete(paymentsTable)
    .where(
      and(
        eq(paymentsTable.id, params.data.paymentId),
        eq(paymentsTable.loanId, params.data.id),
      ),
    )
    .returning();

  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
