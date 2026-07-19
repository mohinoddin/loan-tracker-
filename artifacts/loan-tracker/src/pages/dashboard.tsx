import { Layout } from "@/components/layout"
import { useGetLoanSummary, useListLoans, getGetLoanSummaryQueryKey, getListLoansQueryKey } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Link } from "wouter"
import { ArrowRight, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2 } from "lucide-react"

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetLoanSummary()
  const { data: loans, isLoading: isLoansLoading } = useListLoans()

  const borrowedLoans = loans?.filter(l => l.type === 'borrowed') || []
  const lentLoans = loans?.filter(l => l.type === 'lent') || []

  if (isSummaryLoading || isLoansLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
          </div>
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-10">
        <div>
          <h2 className="text-3xl font-serif text-primary mb-2">Overview</h2>
          <p className="text-muted-foreground">Your complete financial position at a glance.</p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ArrowDownLeft className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium uppercase tracking-wider">Owed (Borrowed)</span>
                </div>
                <div className="text-3xl font-serif text-foreground">
                  {formatCurrency(summary.totalBorrowedOutstanding)}
                </div>
                <div className="text-sm text-muted-foreground mt-2 border-t pt-2">
                  Principal: {formatCurrency(summary.totalBorrowed)}<br/>
                  Interest Accrued: {formatCurrency(summary.totalInterestOwed)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <ArrowUpRight className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium uppercase tracking-wider">Receivable (Lent)</span>
                </div>
                <div className="text-3xl font-serif text-foreground">
                  {formatCurrency(summary.totalLentOutstanding)}
                </div>
                <div className="text-sm text-muted-foreground mt-2 border-t pt-2">
                  Principal: {formatCurrency(summary.totalLent)}<br/>
                  Interest Accrued: {formatCurrency(summary.totalInterestReceivable)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-wider">Active</span>
                </div>
                <div className="text-3xl font-serif text-foreground">
                  {summary.activeLoansCount}
                </div>
                <div className="text-sm text-muted-foreground mt-2 border-t pt-2">
                  {summary.closedLoansCount} closed records
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-primary text-primary-foreground border-transparent">
              <CardContent className="pt-6 flex flex-col justify-center h-full">
                <div className="text-sm font-medium opacity-80 uppercase tracking-wider mb-2">Net Position</div>
                <div className="text-3xl font-serif">
                  {formatCurrency(summary.totalLentOutstanding - summary.totalBorrowedOutstanding)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif text-primary">Borrowed from others</h3>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-transparent">Owed</Badge>
            </div>
            
            <div className="space-y-4">
              {borrowedLoans.length === 0 ? (
                <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                  <p>No borrowed records found.</p>
                </div>
              ) : (
                borrowedLoans.map(loan => (
                  <Link key={loan.id} href={`/loans/${loan.id}`} className="block">
                    <Card className="hover:border-primary transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{loan.personName}</h4>
                            {loan.status === 'closed' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Closed</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> {formatDate(loan.startDate)} &bull; {loan.interestRateMonthly}% / mo
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif font-medium text-lg group-hover:text-primary transition-colors">
                            {formatCurrency(loan.principal)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif text-primary">Lent to others</h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-transparent">Receivable</Badge>
            </div>
            
            <div className="space-y-4">
              {lentLoans.length === 0 ? (
                <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                  <p>No lent records found.</p>
                </div>
              ) : (
                lentLoans.map(loan => (
                  <Link key={loan.id} href={`/loans/${loan.id}`} className="block">
                    <Card className="hover:border-primary transition-colors cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{loan.personName}</h4>
                            {loan.status === 'closed' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Closed</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> {formatDate(loan.startDate)} &bull; {loan.interestRateMonthly}% / mo
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-serif font-medium text-lg group-hover:text-primary transition-colors">
                            {formatCurrency(loan.principal)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
