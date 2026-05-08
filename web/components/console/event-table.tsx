"use client"

import { useState } from "react"
import { useI18n } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { explainEvent } from "@/lib/console-api"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Globe,
  Info,
  MapPin,
  Shield,
  Wifi,
} from "lucide-react"
import type { AiExplanationDto } from "@/lib/console-types"
import { toast } from "sonner"
import { HelperText, InsetPanel, MetaLabel } from "./primitives"

type Severity = "critical" | "warning" | "info" | "success"

export interface EventRow {
  id: string
  timestamp: string
  method: string
  path: string
  host?: string
  hostStatus?: "protected" | "unprotected" | "unknown"
  subject?: string
  statusCode: number
  rule?: string
  severity: Severity
  ip: string
  ipVersion: "IPv4" | "IPv6"
  country?: string
  countryCode?: string
  region?: string
  city?: string
  timezone?: string
  asn?: string
  asnOrg?: string
  isp?: string
  isProxy?: boolean
  isVPN?: boolean
  isTor?: boolean
  isDatacenter?: boolean
  userAgent?: string
  responseTime?: number
  requestId?: string
}

interface EventTableProps {
  events: EventRow[]
  className?: string
  onRowClick?: (event: EventRow) => void
  selectedEventId?: string
}

const severityConfig: Record<Severity, { icon: typeof AlertCircle; className: string }> = {
  critical: { icon: AlertCircle, className: "text-status-error" },
  warning: { icon: AlertTriangle, className: "text-status-warning" },
  info: { icon: Info, className: "text-status-info" },
  success: { icon: CheckCircle, className: "text-status-active" },
}

const methodColors: Record<string, string> = {
  GET: "text-status-info",
  POST: "text-status-active",
  PUT: "text-status-warning",
  PATCH: "text-status-warning",
  DELETE: "text-status-error",
}

function hostStatusConfig(status: EventRow["hostStatus"] | undefined, protectedLabel: string, unprotectedLabel: string, pendingLabel: string) {
  switch (status) {
    case "protected":
      return {
        label: protectedLabel,
        className: "border-status-active/30 bg-status-active/10 text-status-active",
      }
    case "unprotected":
      return {
        label: unprotectedLabel,
        className: "border-status-error/30 bg-status-error/10 text-status-error",
      }
    default:
      return {
        label: pendingLabel,
        className: "border-border bg-muted text-muted-foreground",
      }
  }
}

function statusBadgeClass(statusCode: number) {
  if (statusCode >= 500) return "border-status-error/40 bg-status-error/10 text-status-error"
  if (statusCode >= 400) return "border-status-warning/40 bg-status-warning/10 text-status-warning"
  return "border-status-active/40 bg-status-active/10 text-status-active"
}

function responseTimeClass(responseTime: number) {
  if (responseTime >= 1000) return "border-status-error/40 bg-status-error/10 text-status-error"
  if (responseTime >= 400) return "border-status-warning/40 bg-status-warning/10 text-status-warning"
  return "border-status-active/40 bg-status-active/10 text-status-active"
}

function formatLocation(event: EventRow) {
  return [event.country, event.region, event.city].filter(Boolean).join(", ")
}

function formatLatencyLabel(responseTime: number | undefined, notCaptured: string) {
  return responseTime !== undefined ? `${responseTime}ms` : notCaptured
}

function hasValue(value: string | undefined | null) {
  return Boolean(value && value.trim().length > 0)
}

function displayValue(value: string | undefined, fallback: string) {
  return hasValue(value) ? value!.trim() : fallback
}

export function EventTable({ events, className, onRowClick, selectedEventId }: EventTableProps) {
  const { t } = useI18n()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [logEvent, setLogEvent] = useState<EventRow | null>(null)
  const [aiExplanation, setAiExplanation] = useState<AiExplanationDto | null>(null)
  const [isExplainingId, setIsExplainingId] = useState<string | null>(null)
  const notCaptured = t("common.notCaptured")
  const noHost = t("component.eventTable.noHost")
  const noSubject = t("component.eventTable.noSubject")
  const noRequestId = t("component.eventTable.noRequestId")
  const noUserAgent = t("component.eventTable.noUserAgent")
  const latencyPending = t("component.eventTable.latencyPending")
  const hostStatus = (status?: EventRow["hostStatus"]) =>
    hostStatusConfig(status, t("common.protected"), t("common.unprotected"), t("common.pendingCheck"))

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleExplainEvent = async (event: EventRow) => {
    setIsExplainingId(event.id)
    try {
      const response = await explainEvent({
        requestId: event.requestId,
        host: event.host,
        path: event.path,
        method: event.method,
        statusCode: event.statusCode,
        responseTimeMs: event.responseTime,
        clientIp: event.ip,
        userAgent: event.userAgent,
      })
      setAiExplanation(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("component.eventTable.aiError"))
    } finally {
      setIsExplainingId(null)
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      <div className="hidden border-b border-border/80 bg-muted/20 px-4 py-3 lg:block">
        <div className="grid grid-cols-[minmax(0,1.6fr)_96px_112px_176px_160px_96px] gap-4 text-xs font-medium text-muted-foreground">
          <div>{t("component.eventTable.request")}</div>
          <div>{t("component.eventTable.status")}</div>
          <div>{t("component.eventTable.latency")}</div>
          <div>{t("component.eventTable.sourceIp")}</div>
          <div>{t("component.eventTable.rule")}</div>
          <div>{t("component.eventTable.time")}</div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {events.map((event) => {
          const isExpanded = expandedRows.has(event.id)
          const isSelected = selectedEventId === event.id
          const config = severityConfig[event.severity]
          const Icon = config.icon
          const isExplaining = isExplainingId === event.id

          return (
            <div key={event.id} className={cn(isSelected && "bg-accent/40")}>
              <button
                type="button"
                className={cn(
                  "w-full px-4 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isSelected && "bg-accent/60"
                )}
                onClick={() => {
                  toggleRow(event.id)
                  onRowClick?.(event)
                }}
                aria-expanded={isExpanded}
              >
                <div className="flex items-start gap-3 lg:hidden">
                  <div className="mt-0.5 flex h-5 w-5 items-center justify-center text-muted-foreground">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Icon className={cn("h-4 w-4 shrink-0", config.className)} />
                          <span className={cn("text-xs font-mono font-medium", methodColors[event.method])}>{event.method}</span>
                          <Badge variant="outline" className={cn("font-mono text-xs", statusBadgeClass(event.statusCode))}>
                            {event.statusCode}
                          </Badge>
                          {event.responseTime !== undefined ? (
                            <span className={cn("inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-medium tabular-nums", responseTimeClass(event.responseTime))}>
                              {event.responseTime}ms
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">{latencyPending}</span>
                          )}
                        </div>
                        {event.host ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground" title={event.host}>{event.host}</span>
                            <span className={cn("inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-medium", hostStatus(event.hostStatus).className)}>
                              {hostStatus(event.hostStatus).label}
                            </span>
                          </div>
                        ) : null}
                        <div className="break-all text-sm text-foreground">{event.path}</div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">{event.timestamp}</div>
                    </div>

                    <div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 px-3.5 py-3 text-xs sm:grid-cols-3">
                      <div className="space-y-1">
                        <div className="text-muted-foreground">{t("component.eventTable.sourceIp")}</div>
                        <div className="flex items-center gap-1.5">
                          <code
                            className={cn("break-all font-mono text-foreground", event.ip === notCaptured && "text-muted-foreground")}
                            title={displayValue(event.ip, notCaptured)}
                          >
                            {event.ip}
                          </code>
                          {event.ipVersion === "IPv6" && event.ip !== notCaptured ? (
                            <Badge variant="outline" className="min-h-5 px-1.5 text-xs">v6</Badge>
                          ) : null}
                          {(event.isProxy || event.isVPN || event.isTor) ? <Shield className="h-3.5 w-3.5 shrink-0 text-status-warning" /> : null}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">{t("component.eventTable.rule")}</div>
                        <div className="break-all font-mono text-foreground" title={displayValue(event.rule, "-")}>{event.rule || "-"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-muted-foreground">{t("component.eventTable.subject")}</div>
                        <div className="break-all font-mono text-foreground" title={displayValue(event.subject, noSubject)}>
                          {displayValue(event.subject, noSubject)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.6fr)_96px_112px_176px_160px_96px] lg:gap-4 lg:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                    <Icon className={cn("h-4 w-4 shrink-0", config.className)} />
                    <span className={cn("w-10 shrink-0 text-xs font-mono font-medium", methodColors[event.method])}>{event.method}</span>
                    <div className="min-w-0 space-y-1.5">
                      {event.host ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-xs uppercase tracking-[0.12em] text-muted-foreground" title={event.host}>{event.host}</span>
                          <span className={cn("inline-flex min-h-6 shrink-0 items-center rounded-full border px-2 text-xs font-medium", hostStatus(event.hostStatus).className)}>
                            {hostStatus(event.hostStatus).label}
                          </span>
                        </div>
                      ) : null}
                      <div className="break-all text-sm text-foreground">{event.path}</div>
                    </div>
                  </div>

                  <div>
                    <Badge variant="outline" className={cn("min-h-7 font-mono text-xs", statusBadgeClass(event.statusCode))}>
                      {event.statusCode}
                    </Badge>
                  </div>

                  <div>
                    {event.responseTime !== undefined ? (
                      <span className={cn("inline-flex min-h-7 min-w-18 items-center justify-center rounded-full border px-2.5 text-xs font-medium tabular-nums", responseTimeClass(event.responseTime))}>
                        {event.responseTime}ms
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{latencyPending}</span>
                    )}
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    <code
                      className={cn("truncate font-mono text-xs text-foreground", event.ip === notCaptured && "text-muted-foreground")}
                      title={displayValue(event.ip, notCaptured)}
                    >
                      {event.ip}
                    </code>
                    {event.ipVersion === "IPv6" && event.ip !== notCaptured ? (
                      <Badge variant="outline" className="min-h-5 px-1.5 text-xs">v6</Badge>
                    ) : null}
                    {(event.isProxy || event.isVPN || event.isTor) ? <Shield className="h-3.5 w-3.5 shrink-0 text-status-warning" /> : null}
                  </div>

                  <div className="truncate" title={displayValue(event.rule, "-")}>
                    {event.rule ? <span className="font-mono text-xs text-muted-foreground">{event.rule}</span> : <span className="text-xs text-muted-foreground">-</span>}
                  </div>

                  <div className="text-xs text-muted-foreground">{event.timestamp}</div>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-border/80 bg-muted/20 px-4 py-4">
                  <div className="mb-4 grid gap-3 rounded-lg border border-border/70 bg-background px-4 py-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("component.eventTable.status")}
                      </div>
                      <Badge variant="outline" className={cn("min-h-7 w-fit font-mono text-xs", statusBadgeClass(event.statusCode))}>
                        {event.statusCode}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("component.eventTable.responseTime")}
                      </div>
                      <div className="text-sm font-medium tabular-nums text-foreground">
                        {formatLatencyLabel(event.responseTime, latencyPending)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("component.eventTable.host")}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className={cn("break-all text-xs font-mono text-foreground", !hasValue(event.host) && "text-muted-foreground")}>
                          {displayValue(event.host, noHost)}
                        </code>
                        {event.host ? (
                          <span className={cn("inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-medium", hostStatus(event.hostStatus).className)}>
                            {hostStatus(event.hostStatus).label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {t("component.eventTable.requestId")}
                      </div>
                      <div className={cn("break-all text-xs font-mono text-foreground", !hasValue(event.requestId) && "text-muted-foreground")}>
                        {displayValue(event.requestId, noRequestId)}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="space-y-3">
                      <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        {t("component.eventTable.ipDetails")}
                      </h4>
                      <InsetPanel className="space-y-3 p-3.5">
                        <div className="flex items-center justify-between gap-3">
                          <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.ipAddress")}</MetaLabel>
                          <div className="flex items-center gap-1.5">
                            <code className={cn("text-xs font-mono", event.ip === notCaptured && "text-muted-foreground")}>{event.ip}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg p-0"
                              disabled={event.ip === notCaptured}
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(event.ip)
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.version")}</MetaLabel>
                          <Badge variant="outline" className="min-h-6 text-xs">{event.ipVersion}</Badge>
                        </div>
                        {event.country ? (
                          <div className="flex items-start justify-between gap-3">
                            <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.location")}</MetaLabel>
                            <span className="flex max-w-[75%] items-center gap-1 text-right text-xs text-foreground">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="break-words">{formatLocation(event)}</span>
                            </span>
                          </div>
                        ) : null}
                        {event.timezone ? (
                          <div className="flex items-center justify-between gap-3">
                            <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.timezone")}</MetaLabel>
                            <span className="text-xs text-foreground">{event.timezone}</span>
                          </div>
                        ) : null}
                      </InsetPanel>
                    </div>

                    <div className="space-y-3">
                      <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Shield className="h-3.5 w-3.5" />
                        {t("component.eventTable.proxySignals")}
                      </h4>
                      <InsetPanel className="flex min-h-full flex-wrap content-start gap-2 p-3.5">
                        {event.isVPN ? (
                          <Badge variant="secondary" className="min-h-6 text-xs">
                            <Wifi className="mr-1 h-3 w-3" />
                            VPN
                          </Badge>
                        ) : null}
                        {event.isProxy ? <Badge variant="secondary" className="min-h-6 text-xs">{t("component.filter.proxy")}</Badge> : null}
                        {event.isTor ? <Badge variant="destructive" className="min-h-6 text-xs">Tor</Badge> : null}
                        {event.isDatacenter ? <Badge variant="secondary" className="min-h-6 text-xs">{t("component.filter.datacenter")}</Badge> : null}
                        {!event.isVPN && !event.isProxy && !event.isTor && !event.isDatacenter ? (
                          <span className="text-xs text-muted-foreground">{t("component.eventTable.noProxySignals")}</span>
                        ) : null}
                      </InsetPanel>
                    </div>

                    <div className="space-y-3">
                      <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Info className="h-3.5 w-3.5" />
                        {t("component.eventTable.requestDetails")}
                      </h4>
                      <InsetPanel className="space-y-3 p-3.5">
                        <div className="space-y-1">
                          <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.fullPath")}</MetaLabel>
                          <p className="break-all font-mono text-xs text-foreground">{event.path}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.subject")}</MetaLabel>
                          <code className={cn("break-all text-xs font-mono text-foreground", !hasValue(event.subject) && "text-muted-foreground")}>
                            {displayValue(event.subject, noSubject)}
                          </code>
                        </div>
                        <div className="space-y-1">
                          <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.userAgent")}</MetaLabel>
                          <HelperText size="xs" className={cn("break-all", !hasValue(event.userAgent) && "text-muted-foreground")}>
                            {displayValue(event.userAgent, noUserAgent)}
                          </HelperText>
                        </div>
                        {event.asn || event.asnOrg || event.isp ? (
                          <div className="space-y-1">
                            <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.networkOwnership")}</MetaLabel>
                            <HelperText size="xs" className="break-all">
                              {[event.asn, event.asnOrg, event.isp].filter(Boolean).join(" · ")}
                            </HelperText>
                          </div>
                        ) : null}
                      </InsetPanel>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4">
                    <div className="text-xs text-muted-foreground">
                      {event.userAgent ? t("component.eventTable.userAgent") : t("component.eventTable.requestDetails")}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-3 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLogEvent(event)
                        }}
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        {t("component.eventTable.viewFullLog")}
                      </Button>
                      <Button variant="outline" size="sm" className="px-3 text-xs">
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        {t("component.eventTable.blockIp")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="px-3 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleExplainEvent(event)
                        }}
                      >
                        <Info className="mr-1 h-3.5 w-3.5" />
                        {isExplaining ? t("component.eventTable.aiExplaining") : t("component.eventTable.aiExplain")}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}

        {events.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {t("component.eventTable.empty")}
          </div>
        ) : null}
      </div>

      <Dialog open={logEvent !== null} onOpenChange={(open) => !open && setLogEvent(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("component.eventTable.fullLogTitle")}</DialogTitle>
            <DialogDescription>{t("component.eventTable.fullLogDescription")}</DialogDescription>
          </DialogHeader>
          {logEvent ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InsetPanel className="p-3.5">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.host")}</MetaLabel>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className={cn("break-all font-mono text-sm", !hasValue(logEvent.host) && "text-muted-foreground")}>
                      {displayValue(logEvent.host, noHost)}
                    </div>
                    {logEvent.host ? (
                      <span className={cn("inline-flex min-h-6 items-center rounded-full border px-2 text-xs font-medium", hostStatus(logEvent.hostStatus).className)}>
                        {hostStatus(logEvent.hostStatus).label}
                      </span>
                    ) : null}
                  </div>
                </InsetPanel>
                <InsetPanel className="p-3.5">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.requestId")}</MetaLabel>
                  <div className={cn("mt-1 break-all font-mono text-sm", !hasValue(logEvent.requestId) && "text-muted-foreground")}>
                    {displayValue(logEvent.requestId, noRequestId)}
                  </div>
                </InsetPanel>
                <InsetPanel className="p-3.5 sm:col-span-2">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.fullPath")}</MetaLabel>
                  <div className="mt-1 break-all font-mono text-sm">{logEvent.path}</div>
                </InsetPanel>
                <InsetPanel className="p-3.5">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.sourceIp")}</MetaLabel>
                  <div className={cn("mt-1 break-all font-mono text-sm", logEvent.ip === notCaptured && "text-muted-foreground")}>{logEvent.ip}</div>
                </InsetPanel>
                <InsetPanel className="p-3.5">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.statusAndLatency")}</MetaLabel>
                  <div className="mt-1 text-sm">
                    {logEvent.statusCode} / {logEvent.responseTime !== undefined ? `${logEvent.responseTime}ms` : latencyPending}
                  </div>
                </InsetPanel>
                <InsetPanel className="p-3.5 sm:col-span-2">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.userAgent")}</MetaLabel>
                  <div className={cn("mt-1 break-all text-sm", !hasValue(logEvent.userAgent) && "text-muted-foreground")}>
                    {displayValue(logEvent.userAgent, noUserAgent)}
                  </div>
                </InsetPanel>
                <InsetPanel className="p-3.5 sm:col-span-2">
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.geoStatus")}</MetaLabel>
                  <HelperText className="mt-1">
                    {logEvent.country || logEvent.city ? [logEvent.country, logEvent.region, logEvent.city].filter(Boolean).join(" / ") : t("component.eventTable.geoPending")}
                  </HelperText>
                </InsetPanel>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={aiExplanation !== null} onOpenChange={(open) => !open && setAiExplanation(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{aiExplanation?.title ?? t("component.eventTable.aiExplain")}</DialogTitle>
            <DialogDescription>
              {aiExplanation?.model ? `${t("component.eventTable.modelSource")}: ${aiExplanation.model}` : t("component.eventTable.modelExplanation")}
            </DialogDescription>
          </DialogHeader>
          {aiExplanation ? (
            <div className="space-y-4">
              <InsetPanel>
                <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.summary")}</MetaLabel>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{aiExplanation.summary}</p>
              </InsetPanel>
              <div className="grid gap-3 sm:grid-cols-2">
                <InsetPanel>
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.risk")}</MetaLabel>
                  <div className="mt-1 text-sm text-foreground">{aiExplanation.risk}</div>
                </InsetPanel>
                <InsetPanel>
                  <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.confidence")}</MetaLabel>
                  <div className="mt-1 text-sm text-foreground">{aiExplanation.confidence}</div>
                </InsetPanel>
              </div>
              <InsetPanel>
                <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.evidence")}</MetaLabel>
                <div className="mt-2 space-y-2">
                  {aiExplanation.evidence.map((item, index) => (
                    <p key={`${item}-${index}`} className="text-sm text-foreground">{item}</p>
                  ))}
                </div>
              </InsetPanel>
              <InsetPanel>
                <MetaLabel className="normal-case tracking-normal text-xs">{t("component.eventTable.nextSteps")}</MetaLabel>
                <div className="mt-2 space-y-2">
                  {aiExplanation.nextSteps.map((item, index) => (
                    <p key={`${item}-${index}`} className="text-sm text-foreground">{item}</p>
                  ))}
                </div>
              </InsetPanel>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
