"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/components/i18n-provider"
import { HelperText, InsetPanel, MetaLabel } from "./primitives"
import { 
  Globe, 
  MapPin, 
  Building2, 
  Shield, 
  Wifi, 
  AlertTriangle,
  Server,
  Clock,
  Copy,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/button"

export interface IPInfo {
  ip: string
  version: "IPv4" | "IPv6"
  // 地理信息
  country?: string
  countryCode?: string
  region?: string
  city?: string
  timezone?: string
  // 网络信息
  asn?: string
  asnOrg?: string
  isp?: string
  // 代理/威胁检测
  isProxy?: boolean
  isVPN?: boolean
  isTor?: boolean
  isDatacenter?: boolean
  isBot?: boolean
  threatLevel?: "low" | "medium" | "high" | "critical"
  // 其他
  requestCount?: number
  lastSeen?: string
  firstSeen?: string
}

interface IPDetailCardProps {
  ipInfo: IPInfo
  className?: string
  onViewHistory?: () => void
  onBlock?: () => void
}

const threatLevelConfig = {
  low: { labelKey: "component.ip.threat.low", className: "bg-status-active/10 text-status-active border-status-active/20" },
  medium: { labelKey: "component.ip.threat.medium", className: "bg-status-warning/10 text-status-warning border-status-warning/20" },
  high: { labelKey: "component.ip.threat.high", className: "bg-status-error/10 text-status-error border-status-error/20" },
  critical: { labelKey: "component.ip.threat.critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

export function IPDetailCard({ ipInfo, className, onViewHistory, onBlock }: IPDetailCardProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const notCaptured = t("common.notCaptured")
  const unknown = t("common.unknown")
  const ipUnavailable = t("component.ip.unavailable")
  const hasValidIp =
    ipInfo.ip !== notCaptured &&
    ipInfo.ip !== unknown &&
    ipInfo.ip !== ipUnavailable &&
    ipInfo.ip.trim().length > 0

  const copyIP = () => {
    if (!hasValidIp) return
    navigator.clipboard.writeText(ipInfo.ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const threatConfig = ipInfo.threatLevel ? threatLevelConfig[ipInfo.threatLevel] : null

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{t("component.ip.title")}</h3>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3" onClick={onViewHistory}>
              <Clock className="h-3.5 w-3.5 mr-1" />
              {t("component.ip.history")}
            </Button>
          )}
          {onBlock && (
            <Button variant="outline" size="sm" className="min-h-11 rounded-lg px-3 text-destructive hover:text-destructive" onClick={onBlock}>
              <Shield className="h-3.5 w-3.5 mr-1" />
              {t("component.ip.block")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <InsetPanel>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <code className={cn(
                "truncate text-lg font-mono font-medium text-foreground",
                !hasValidIp && "text-muted-foreground",
                ipInfo.version === "IPv6" ? "text-sm" : ""
              )}>
                {ipInfo.ip}
              </code>
              <Badge variant="outline" className="min-h-6 text-xs">
                {ipInfo.version}
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-11 w-11 rounded-lg" onClick={copyIP} disabled={!hasValidIp}>
              <Copy className={cn("h-3.5 w-3.5", copied && "text-status-active")} />
            </Button>
          </div>

          {threatConfig ? (
            <div className={cn("mt-4 flex items-center gap-2 rounded-lg border px-3 py-2", threatConfig.className)}>
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">{t(threatConfig.labelKey)}</span>
            </div>
          ) : null}

          {(ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor || ipInfo.isDatacenter || ipInfo.isBot) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ipInfo.isProxy && (
                <Badge variant="secondary" className="text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  {t("component.ip.proxy")}
                </Badge>
              )}
              {ipInfo.isVPN && (
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  VPN
                </Badge>
              )}
              {ipInfo.isTor && (
                <Badge variant="destructive" className="text-xs">
                  {t("component.ip.torExit")}
                </Badge>
              )}
              {ipInfo.isDatacenter && (
                <Badge variant="secondary" className="text-xs">
                  <Server className="h-3 w-3 mr-1" />
                  {t("component.ip.datacenter")}
                </Badge>
              )}
              {ipInfo.isBot && (
                <Badge variant="destructive" className="text-xs">
                  {t("component.ip.bot")}
                </Badge>
              )}
            </div>
          )}
        </InsetPanel>

        <InsetPanel>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            <MetaLabel>{t("component.ip.location")}</MetaLabel>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {ipInfo.country || unknown}
                {ipInfo.countryCode && <span className="text-muted-foreground ml-1">({ipInfo.countryCode})</span>}
              </span>
            </div>
            {(ipInfo.region || ipInfo.city) && (
              <div className="text-muted-foreground">
                {[ipInfo.region, ipInfo.city].filter(Boolean).join(", ")}
              </div>
            )}
            {ipInfo.timezone && (
              <HelperText size="xs">
                {t("component.ip.timezone")}: {ipInfo.timezone}
              </HelperText>
            )}
          </div>
        </InsetPanel>

        <InsetPanel>
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            <MetaLabel>{t("component.ip.network")}</MetaLabel>
          </div>
          <div className="mt-3 space-y-1.5 text-sm">
            {ipInfo.asn && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{ipInfo.asn}</span>
                {ipInfo.asnOrg && <span>{ipInfo.asnOrg}</span>}
              </div>
            )}
            {ipInfo.isp && (
              <div className="text-muted-foreground">
                {t("component.ip.isp")}: {ipInfo.isp}
              </div>
            )}
          </div>
        </InsetPanel>

        {(ipInfo.requestCount !== undefined || ipInfo.lastSeen || ipInfo.firstSeen) && (
          <InsetPanel>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <MetaLabel>{t("component.ip.activity")}</MetaLabel>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {ipInfo.requestCount !== undefined && (
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">{t("component.ip.requestCount")}</div>
                  <div className="mt-1 font-medium text-foreground">{ipInfo.requestCount.toLocaleString()}</div>
                </div>
              )}
              {ipInfo.firstSeen && (
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">{t("component.ip.firstSeen")}</div>
                  <div className="mt-1 font-medium text-foreground">{ipInfo.firstSeen}</div>
                </div>
              )}
              {ipInfo.lastSeen && (
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">{t("component.ip.lastSeen")}</div>
                  <div className="mt-1 font-medium text-foreground">{ipInfo.lastSeen}</div>
                </div>
              )}
            </div>
          </InsetPanel>
        )}

        {hasValidIp && (
          <div className="border-t border-border/80 pt-4">
            <Button variant="ghost" size="pill" className="w-full justify-start rounded-lg" asChild>
              <a
                href={`https://ipinfo.io/${ipInfo.ip}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                {t("component.ip.viewMore")}
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
