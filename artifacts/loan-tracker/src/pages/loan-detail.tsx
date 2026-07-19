import { useState, useRef, useEffect } from "react"
import { Layout } from "@/components/layout"
import { useLocation, useParams } from "wouter"
import {
  useGetLoan,
  useUpdateLoan,
  useDeleteLoan,
  useListPayments,
  useCreatePayment,
  useDeletePayment,
  getGetLoanQueryKey,
  getListPaymentsQueryKey,
} from "@workspace/api-client-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Printer, Trash2, Edit2, X, Plus, Sparkles, AlertCircle, ArrowLeft } from "lucide-react"

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "Date is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  principalPaid: z.coerce.number().min(0, "Cannot be negative"),
  interestPaid: z.coerce.number().min(0, "Cannot be negative"),
  notes: z.string().optional(),
}).refine(data => Math.abs(data.amount - (data.principalPaid + data.interestPaid)) < 0.01, {
  message: "Principal and Interest paid must sum up to the total amount",
  path: ["amount"]
})

const editLoanSchema = z.object({
  personName: z.string().min(1, "Name is required"),
  principal: z.coerce.number().min(0.01, "Must be greater than 0"),
  interestRateMonthly: z.coerce.number().min(0, "Cannot be negative"),
  startDate: z.string().min(1, "Date is required"),
  status: z.enum(["active", "closed"]),
})

type PaymentFormValues = z.infer<typeof paymentSchema>
type EditLoanValues = z.infer<typeof editLoanSchema>

export default function LoanDetail() {
  const params = useParams()
  const id = Number(params.id)
  const [, setLocation] = useLocation()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: loan, isLoading: isLoanLoading, isError } = useGetLoan(id, {
    query: { enabled: !!id, queryKey: getGetLoanQueryKey(id) }
  })
  
  const { data: payments, isLoading: isPaymentsLoading } = useListPayments(id, {
    query: { enabled: !!id, queryKey: getListPaymentsQueryKey(id) }
  })

  const updateLoan = useUpdateLoan()
  const deleteLoan = useDeleteLoan()
  const createPayment = useCreatePayment()
  const deletePayment = useDeletePayment()

  const [isEditingLoan, setIsEditingLoan] = useState(false)
  
  // AI Notes Refinement State
  const [rawNotes, setRawNotes] = useState("")
  const [refinedNotes, setRefinedNotes] = useState("")
  const [isRefining, setIsRefining] = useState(false)

  // Initialize edit form with loan data
  const editForm = useForm<EditLoanValues>({
    resolver: zodResolver(editLoanSchema),
    defaultValues: {
      personName: "",
      principal: 0,
      interestRateMonthly: 0,
      startDate: "",
      status: "active",
    }
  })

  // Payment form
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentDate: new Date().toISOString().split('T')[0],
      amount: 0,
      principalPaid: 0,
      interestPaid: 0,
      notes: "",
    }
  })

  // Watch amount to optionally auto-fill principal/interest if user wants
  // Real apps might auto-calculate, but we'll leave it manual with validation as requested.
  const pAmount = paymentForm.watch("amount")
  const pPrincipal = paymentForm.watch("principalPaid")
  const pInterest = paymentForm.watch("interestPaid")

  useEffect(() => {
    if (loan && !isEditingLoan) {
      editForm.reset({
        personName: loan.personName,
        principal: loan.principal,
        interestRateMonthly: loan.interestRateMonthly,
        startDate: loan.startDate.split('T')[0],
        status: loan.status,
      })
      if (refinedNotes === "") {
        setRefinedNotes(loan.notes || "")
      }
    }
  }, [loan, isEditingLoan, editForm, refinedNotes])

  if (isError || (!isLoanLoading && !loan)) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Record Not Found</h2>
          <p className="text-muted-foreground mb-6">This record might have been deleted or doesn't exist.</p>
          <Button onClick={() => setLocation("/")}>Back to Dashboard</Button>
        </div>
      </Layout>
    )
  }

  if (isLoanLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-16 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-lg" />)}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </Layout>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDeleteLoan = () => {
    deleteLoan.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Record deleted" })
        queryClient.invalidateQueries({ queryKey: ["/api/loans"] })
        queryClient.invalidateQueries({ queryKey: ["/api/loans/summary"] })
        setLocation("/")
      },
      onError: () => {
        toast({ title: "Error", description: "Could not delete record", variant: "destructive" })
      }
    })
  }

  const onEditLoanSubmit = (data: EditLoanValues) => {
    updateLoan.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: "Record updated" })
        setIsEditingLoan(false)
        queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: ["/api/loans"] })
        queryClient.invalidateQueries({ queryKey: ["/api/loans/summary"] })
      },
      onError: () => {
        toast({ title: "Error updating record", variant: "destructive" })
      }
    })
  }

  const onPaymentSubmit = (data: PaymentFormValues) => {
    createPayment.mutate({ id, data }, {
      onSuccess: () => {
        toast({ title: "Payment recorded" })
        paymentForm.reset()
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: ["/api/loans/summary"] })
      },
      onError: () => {
        toast({ title: "Error recording payment", variant: "destructive" })
      }
    })
  }

  const handleDeletePayment = (paymentId: number) => {
    deletePayment.mutate({ id, paymentId }, {
      onSuccess: () => {
        toast({ title: "Payment deleted" })
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) })
        queryClient.invalidateQueries({ queryKey: ["/api/loans/summary"] })
      },
      onError: () => {
        toast({ title: "Error deleting payment", variant: "destructive" })
      }
    })
  }

  const handleRefineNotes = async () => {
    if (!rawNotes.trim()) return
    
    setIsRefining(true)
    try {
      const res = await fetch('/api/refine-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawNotes })
      })
      if (!res.ok) throw new Error("Failed to refine notes")
      
      const data = await res.json()
      setRefinedNotes(data.refinedText)
      toast({ title: "Notes refined with AI" })
    } catch (err) {
      toast({ title: "Error refining notes", variant: "destructive" })
    } finally {
      setIsRefining(false)
    }
  }

  const handleSaveNotes = () => {
    updateLoan.mutate({ id, data: { notes: refinedNotes } }, {
      onSuccess: () => {
        toast({ title: "Notes saved successfully" })
        queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(id) })
      },
      onError: () => {
        toast({ title: "Error saving notes", variant: "destructive" })
      }
    })
  }

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="mb-2 -ml-2 text-muted-foreground no-print">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-serif text-primary">{loan?.personName}</h1>
              <Badge variant={loan?.type === 'borrowed' ? 'destructive' : 'default'} className="uppercase tracking-wider text-[10px]">
                {loan?.type}
              </Badge>
              {loan?.status === 'closed' && <Badge variant="secondary" className="uppercase tracking-wider text-[10px]">Closed</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">Record ID #{loan?.id} &bull; Started {loan ? formatDate(loan.startDate) : ''}</p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" /> PDF Report
            </Button>
            <Button variant="outline" onClick={() => setIsEditingLoan(!isEditingLoan)}>
              {isEditingLoan ? <><X className="w-4 h-4 mr-2" /> Cancel Edit</> : <><Edit2 className="w-4 h-4 mr-2" /> Edit</>}
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this record and all associated payment history.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLoan} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete Record
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {isEditingLoan && (
          <Card className="border-primary shadow-sm bg-primary/5 no-print">
            <CardHeader>
              <CardTitle>Edit Record Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditLoanSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={editForm.control} name="personName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Counterparty Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="principal" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Principal</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="interestRateMonthly" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rate (%)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={editForm.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsEditingLoan(false)}>Cancel</Button>
                    <Button type="submit" disabled={updateLoan.isPending}>Save Changes</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Key Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground border-transparent">
            <CardContent className="pt-6">
              <div className="text-sm font-medium opacity-80 uppercase tracking-wider mb-1">Outstanding Balance</div>
              <div className="text-3xl font-serif">
                {formatCurrency(loan?.outstandingBalance || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Original Principal</div>
              <div className="text-2xl font-serif text-foreground">
                {formatCurrency(loan?.principal || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Total Paid</div>
              <div className="text-2xl font-serif text-foreground">
                {formatCurrency(loan?.totalPaid || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Interest Accrued</div>
              <div className="text-2xl font-serif text-foreground">
                {formatCurrency(loan?.totalInterestAccrued || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                over {loan?.monthsElapsed} months
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Two column layout for bottom section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Payments (wider) */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-xl font-serif text-primary mb-4">Payment History</h3>
              <Card>
                {(!payments || payments.length === 0) ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No payments recorded yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right text-muted-foreground">Principal</TableHead>
                        <TableHead className="text-right text-muted-foreground">Interest</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-[50px] no-print"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">{formatDate(p.paymentDate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(p.principalPaid)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatCurrency(p.interestPaid)}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={p.notes || ""}>{p.notes || "-"}</TableCell>
                          <TableCell className="no-print">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete payment?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePayment(p.id)} className="bg-destructive hover:bg-destructive/90 text-white">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>

            <div className="no-print">
              <h3 className="text-xl font-serif text-primary mb-4">Record New Payment</h3>
              <Card>
                <CardContent className="pt-6">
                  <Form {...paymentForm}>
                    <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField control={paymentForm.control} name="paymentDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        
                        <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Amount</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        
                        <FormField control={paymentForm.control} name="principalPaid" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Principal Portion</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        
                        <FormField control={paymentForm.control} name="interestPaid" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Interest Portion</FormLabel>
                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      
                      <FormField control={paymentForm.control} name="notes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Notes (Optional)</FormLabel>
                          <FormControl><Input placeholder="E.g. Bank transfer, Check #123" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={createPayment.isPending}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Payment
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: AI Notes (narrower) */}
          <div className="space-y-4 no-print">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif text-primary">Context & Notes</h3>
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <FormLabel>Official Notes</FormLabel>
                  <Textarea 
                    className="min-h-[120px]" 
                    value={refinedNotes}
                    onChange={(e) => setRefinedNotes(e.target.value)}
                    placeholder="Refined context will appear here. Edit as needed before saving."
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleSaveNotes} disabled={updateLoan.isPending} size="sm">
                      Save Official Notes
                    </Button>
                  </div>
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <FormLabel>Raw Brain Dump</FormLabel>
                  <FormDescription>Type messy notes here, then let AI organize them into professional ledger notes.</FormDescription>
                  <Textarea 
                    className="min-h-[100px] text-sm bg-muted/50" 
                    value={rawNotes}
                    onChange={(e) => setRawNotes(e.target.value)}
                    placeholder="e.g. met at starbucks he said he will pay next week but actually only half..."
                  />
                  <Button 
                    onClick={handleRefineNotes} 
                    disabled={isRefining || !rawNotes.trim()}
                    variant="secondary"
                    className="w-full"
                  >
                    {isRefining ? "Refining..." : "Refine with AI"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Print-only notes section */}
          <div className="hidden print:block col-span-3 mt-8">
            <h3 className="text-xl font-serif text-primary mb-4 border-b pb-2">Record Notes</h3>
            <p className="whitespace-pre-wrap">{loan?.notes || "No notes recorded."}</p>
          </div>

        </div>
      </div>
    </Layout>
  )
}
