import * as React from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { Wallet, Plus, Home, FileText } from "lucide-react"

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card flex-shrink-0 no-print">
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10 text-primary">
            <Wallet className="w-8 h-8" />
            <h1 className="font-serif text-2xl font-semibold tracking-tight">Ledger</h1>
          </div>

          <nav className="space-y-2 flex-grow">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/loans/new"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                location === "/loans/new"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Plus className="w-4 h-4" />
              New Record
            </Link>
          </nav>

          <div className="mt-auto pt-6 text-xs text-muted-foreground">
            <p>Precise. Calm. Controlled.</p>
            <p className="mt-1 opacity-70">Personal Finance Ledger &copy; {new Date().getFullYear()}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background p-6 md:p-10">
        <div className="max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  )
}
