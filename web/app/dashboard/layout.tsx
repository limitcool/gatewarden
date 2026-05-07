import { DashboardShellClient } from "@/components/console/dashboard-shell-client"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShellClient>{children}</DashboardShellClient>
}
