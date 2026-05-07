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
  Info, 
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  MapPin,
  Shield,
  Wifi,
  ExternalLink,
  Copy
} from "lucide-react"
import type { AiExplanationDto } from "@/lib/console-types"
import { toast } from "sonner"

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
  // IP 信息
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
  // 代理检测
  isProxy?: boolean
  isVPN?: boolean
  isTor?: boolean
  isDatacenter?: boolean
  // 其他
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
  critical: {
    icon: AlertCircle,
    className: "text-status-error",
  },
  warning: {
    icon: AlertTriangle,
    className: "text-status-warning",
  },
  info: {
    icon: Info,
    className: "text-status-info",
  },
  success: {
    icon: CheckCircle,
    className: "text-status-active",
  },
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

export function EventTable({ events, className, onRowClick, selectedEventId }: EventTableProps) {
  const { t } = useI18n()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [logEvent, setLogEvent] = useState<EventRow | null>(null)
  const [aiExplanation, setAiExplanation] = useState<AiExplanationDto | null>(null)
  const [isExplaining, setIsExplaining] = useState(false)
  const notCaptured = t("common.notCaptured")
  const hostStatus = (status?: EventRow["hostStatus"]) =>
    hostStatusConfig(status, t("common.protected"), t("common.unprotected"), t("common.pendingCheck"))

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
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
    setIsExplaining(true)
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
      setIsExplaining(false)
    }
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="grid grid-cols-[auto_minmax(0,1.2fr)_80px_88px_160px_120px_80px] gap-4 px-4 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
        <div className="w-6"></div>
        <div>{t("component.eventTable.request")}</div>
        <div>{t("component.eventTable.status")}</div>
        <div>{t("component.eventTable.latency")}</div>
        <div>{t("component.eventTable.sourceIp")}</div>
        <div>{t("component.eventTable.rule")}</div>
        <div>{t("component.eventTable.time")}</div>
      </div>
      
      {/* Body */}
      <div className="divide-y divide-border">
        {events.map((event) => {
          const isExpanded = expandedRows.has(event.id)
          const isSelected = selectedEventId === event.id
          const config = severityConfig[event.severity]
          const Icon = config.icon

          return (
            <div key={event.id}>
              {/* Main Row */}
              <div
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1.2fr)_80px_88px_160px_120px_80px] gap-4 px-4 py-3 items-center cursor-pointer transition-colors",
                  isSelected ? "bg-accent" : "hover:bg-accent/50"
                )}
                onClick={() => {
                  toggleRow(event.id)
                  onRowClick?.(event)
                }}
              >
                {/* Expand Icon */}
                <div className="w-6 flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Request */}
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={cn("h-4 w-4 shrink-0", config.className)} />
                  <span className={cn("text-xs font-mono font-medium w-12", methodColors[event.method])}>
                    {event.method}
                  </span>
                  <div className="min-w-0">
                    {event.host && (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">
                          {event.host}
                        </div>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                            hostStatus(event.hostStatus).className
                          )}
                        >
                          {hostStatus(event.hostStatus).label}
                        </span>
                      </div>
                    )}
                    <div className="text-sm break-all">{event.path}</div>
                  </div>
                </div>

                {/* Status Code */}
                <div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] font-mono",
                      event.statusCode >= 200 && event.statusCode < 300 && "border-status-active/50 text-status-active",
                      event.statusCode >= 400 && event.statusCode < 500 && "border-status-warning/50 text-status-warning",
                      event.statusCode >= 500 && "border-status-error/50 text-status-error"
                    )}
                  >
                    {event.statusCode}
                  </Badge>
                </div>

                {/* Response Time */}
                <div className="min-w-0">
                  {event.responseTime !== undefined ? (
                    <span
                      className={cn(
                        "inline-flex min-w-14 items-center justify-center rounded-md border px-2 py-0.5 text-[10px] font-medium tabular-nums",
                        event.responseTime >= 1000 && "border-status-error/40 text-status-error",
                        event.responseTime >= 400 && event.responseTime < 1000 && "border-status-warning/40 text-status-warning",
                        event.responseTime < 400 && "border-status-active/40 text-status-active"
                      )}
                    >
                      {event.responseTime}ms
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{notCaptured}</span>
                  )}
                </div>

                {/* IP */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className={cn(
                    "font-mono text-xs truncate",
                    event.ip === notCaptured && "text-muted-foreground",
                    event.ipVersion === "IPv6" && "text-[10px]"
                  )}>
                    {event.ip}
                  </code>
                  {event.ipVersion === "IPv6" && event.ip !== notCaptured && (
                    <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">v6</Badge>
                  )}
                  {(event.isProxy || event.isVPN || event.isTor) && (
                    <Shield className="h-3 w-3 text-status-warning shrink-0" />
                  )}
                </div>

                {/* Rule */}
                <div className="truncate">
                  {event.rule ? (
                    <span className="text-xs font-mono text-muted-foreground">{event.rule}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground">{event.timestamp}</div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 py-4 bg-muted/20 border-t border-border">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* IP 详情 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {t("component.eventTable.ipDetails")}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{t("component.eventTable.ipAddress")}</span>
                          <div className="flex items-center gap-1">
                            <code className={cn("text-xs font-mono", event.ip === notCaptured && "text-muted-foreground")}>{event.ip}</code>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-5 w-5 p-0"
                              disabled={event.ip === notCaptured}
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(event.ip)
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{t("component.eventTable.version")}</span>
                          <Badge variant="outline" className="text-[10px]">{event.ipVersion}</Badge>
                        </div>
                        {event.country && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.location")}</span>
                            <span className="text-xs flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.country}
                              {[event.region, event.city].filter(Boolean).join(", ").length > 0 &&
                                `, ${[event.region, event.city].filter(Boolean).join(", ")}`}
                            </span>
                          </div>
                        )}
                        {event.timezone && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.timezone")}</span>
                            <span className="text-xs">{event.timezone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 代理检测 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        {t("component.eventTable.proxySignals")}
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {event.isVPN && (
                          <Badge variant="secondary" className="text-[10px]">
                            <Wifi className="h-3 w-3 mr-1" />
                            VPN
                          </Badge>
                        )}
                        {event.isProxy && (
                          <Badge variant="secondary" className="text-[10px]">{t("component.filter.proxy")}</Badge>
                        )}
                        {event.isTor && (
                          <Badge variant="destructive" className="text-[10px]">Tor</Badge>
                        )}
                        {event.isDatacenter && (
                          <Badge variant="secondary" className="text-[10px]">{t("component.filter.datacenter")}</Badge>
                        )}
                        {!event.isVPN && !event.isProxy && !event.isTor && !event.isDatacenter && (
                          <span className="text-xs text-muted-foreground">{t("component.eventTable.noProxySignals")}</span>
                        )}
                      </div>
                    </div>

                    {/* 请求详情 */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        {t("component.eventTable.requestDetails")}
                      </h4>
                      <div className="space-y-2">
                        {event.requestId && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.requestId")}</span>
                            <code className="text-[10px] font-mono">{event.requestId}</code>
                          </div>
                        )}
                        {event.responseTime !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.responseTime")}</span>
                            <span className="text-xs">{event.responseTime}ms</span>
                          </div>
                        )}
                        {event.host && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.host")}</span>
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] font-mono">{event.host}</code>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium",
                                  hostStatus(event.hostStatus).className
                                )}
                              >
                                {hostStatus(event.hostStatus).label}
                              </span>
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-muted-foreground">{t("component.eventTable.fullPath")}</span>
                          <p className="mt-0.5 break-all font-mono text-[10px] text-foreground">{event.path}</p>
                        </div>
                        {event.subject && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.subject")}</span>
                            <code className="text-[10px] font-mono">{event.subject}</code>
                          </div>
                        )}
                        {event.userAgent && (
                          <div>
                            <span className="text-xs text-muted-foreground">User-Agent</span>
                            <p className="mt-0.5 break-all text-[10px] text-muted-foreground">{event.userAgent}</p>
                          </div>
                        )}
                        {(event.asn || event.asnOrg || event.isp) && (
                          <div>
                            <span className="text-xs text-muted-foreground">{t("component.eventTable.networkOwnership")}</span>
                            <p className="mt-0.5 break-all text-[10px] text-muted-foreground">
                              {[event.asn, event.asnOrg, event.isp].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setLogEvent(event)
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {t("component.eventTable.viewFullLog")}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {t("component.eventTable.blockIp")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleExplainEvent(event)
                      }}
                    >
                      <Info className="h-3 w-3 mr-1" />
                      {isExplaining ? t("component.eventTable.aiExplaining") : t("component.eventTable.aiExplain")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        
        {events.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            {t("component.eventTable.empty")}
          </div>
        )}
      </div>

      <Dialog open={logEvent !== null} onOpenChange={(open) => !open && setLogEvent(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("component.eventTable.fullLogTitle")}</DialogTitle>
            <DialogDescription>
              {t("component.eventTable.fullLogDescription")}
            </DialogDescription>
          </DialogHeader>
          {logEvent && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.host")}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="break-all font-mono text-sm">{logEvent.host ?? notCaptured}</div>
                    {logEvent.host && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          hostStatus(logEvent.hostStatus).className
                        )}
                      >
                        {hostStatus(logEvent.hostStatus).label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.requestId")}</div>
                  <div className="mt-1 break-all font-mono text-sm">{logEvent.requestId ?? notCaptured}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.fullPath")}</div>
                  <div className="mt-1 break-all font-mono text-sm">{logEvent.path}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.sourceIp")}</div>
                  <div className={cn("mt-1 break-all font-mono text-sm", logEvent.ip === notCaptured && "text-muted-foreground")}>
                    {logEvent.ip}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.statusAndLatency")}</div>
                  <div className="mt-1 text-sm">
                    {logEvent.statusCode} / {logEvent.responseTime !== undefined ? `${logEvent.responseTime}ms` : notCaptured}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">User-Agent</div>
                  <div className="mt-1 break-all text-sm">{logEvent.userAgent ?? notCaptured}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 sm:col-span-2">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.geoStatus")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {logEvent.country || logEvent.city
                      ? [logEvent.country, logEvent.region, logEvent.city].filter(Boolean).join(" / ")
                      : t("component.eventTable.geoPending")}
                  </div>
                </div>
              </div>
            </div>
          )}
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
          {aiExplanation && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">{t("component.eventTable.summary")}</div>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{aiExplanation.summary}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.risk")}</div>
                  <div className="mt-1 text-sm text-foreground">{aiExplanation.risk}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="text-xs text-muted-foreground">{t("component.eventTable.confidence")}</div>
                  <div className="mt-1 text-sm text-foreground">{aiExplanation.confidence}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">{t("component.eventTable.evidence")}</div>
                <div className="mt-2 space-y-2">
                  {aiExplanation.evidence.map((item, index) => (
                    <p key={`${item}-${index}`} className="text-sm text-foreground">{item}</p>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">{t("component.eventTable.nextSteps")}</div>
                <div className="mt-2 space-y-2">
                  {aiExplanation.nextSteps.map((item, index) => (
                    <p key={`${item}-${index}`} className="text-sm text-foreground">{item}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
