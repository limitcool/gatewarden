import { DashboardShell } from "@/components/console"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
