"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import { useState } from "react"

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
  low: { label: "低风险", className: "bg-status-active/10 text-status-active border-status-active/20" },
  medium: { label: "中风险", className: "bg-status-warning/10 text-status-warning border-status-warning/20" },
  high: { label: "高风险", className: "bg-status-error/10 text-status-error border-status-error/20" },
  critical: { label: "危险", className: "bg-destructive/10 text-destructive border-destructive/20" },
}

export function IPDetailCard({ ipInfo, className, onViewHistory, onBlock }: IPDetailCardProps) {
  const [copied, setCopied] = useState(false)

  const copyIP = () => {
    navigator.clipboard.writeText(ipInfo.ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const threatConfig = ipInfo.threatLevel ? threatLevelConfig[ipInfo.threatLevel] : null

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">IP 详情</h3>
        <div className="flex items-center gap-2">
          {onViewHistory && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onViewHistory}>
              <Clock className="h-3.5 w-3.5 mr-1" />
              历史
            </Button>
          )}
          {onBlock && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onBlock}>
              <Shield className="h-3.5 w-3.5 mr-1" />
              封禁
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* IP 地址 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <code className={cn(
              "text-lg font-mono font-medium",
              ipInfo.version === "IPv6" ? "text-sm" : ""
            )}>
              {ipInfo.ip}
            </code>
            <Badge variant="outline" className="text-[10px] h-5">
              {ipInfo.version}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyIP}>
            <Copy className={cn("h-3.5 w-3.5", copied && "text-status-active")} />
          </Button>
        </div>

        {/* 威胁等级 */}
        {threatConfig && (
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md border",
            threatConfig.className
          )}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{threatConfig.label}</span>
          </div>
        )}

        {/* 代理检测标签 */}
        {(ipInfo.isProxy || ipInfo.isVPN || ipInfo.isTor || ipInfo.isDatacenter || ipInfo.isBot) && (
          <div className="flex flex-wrap gap-1.5">
            {ipInfo.isProxy && (
              <Badge variant="secondary" className="text-[10px]">
                <Wifi className="h-3 w-3 mr-1" />
                代理
              </Badge>
            )}
            {ipInfo.isVPN && (
              <Badge variant="secondary" className="text-[10px]">
                <Shield className="h-3 w-3 mr-1" />
                VPN
              </Badge>
            )}
            {ipInfo.isTor && (
              <Badge variant="destructive" className="text-[10px]">
                Tor 出口
              </Badge>
            )}
            {ipInfo.isDatacenter && (
              <Badge variant="secondary" className="text-[10px]">
                <Server className="h-3 w-3 mr-1" />
                数据中心
              </Badge>
            )}
            {ipInfo.isBot && (
              <Badge variant="destructive" className="text-[10px]">
                机器人
              </Badge>
            )}
          </div>
        )}

        {/* 地理位置 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>地理位置</span>
          </div>
          <div className="pl-5 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {ipInfo.country || "未知"}
                {ipInfo.countryCode && <span className="text-muted-foreground ml-1">({ipInfo.countryCode})</span>}
              </span>
            </div>
            {(ipInfo.region || ipInfo.city) && (
              <div className="text-muted-foreground">
                {[ipInfo.region, ipInfo.city].filter(Boolean).join(", ")}
              </div>
            )}
            {ipInfo.timezone && (
              <div className="text-xs text-muted-foreground">
                时区: {ipInfo.timezone}
              </div>
            )}
          </div>
        </div>

        {/* 网络信息 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>网络信息</span>
          </div>
          <div className="pl-5 space-y-1 text-sm">
            {ipInfo.asn && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{ipInfo.asn}</span>
                {ipInfo.asnOrg && <span>{ipInfo.asnOrg}</span>}
              </div>
            )}
            {ipInfo.isp && (
              <div className="text-muted-foreground">
                ISP: {ipInfo.isp}
              </div>
            )}
          </div>
        </div>

        {/* 请求统计 */}
        {(ipInfo.requestCount !== undefined || ipInfo.lastSeen || ipInfo.firstSeen) && (
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>访问记录</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {ipInfo.requestCount !== undefined && (
                <div>
                  <div className="text-xs text-muted-foreground">请求次数</div>
                  <div className="font-medium">{ipInfo.requestCount.toLocaleString()}</div>
                </div>
              )}
              {ipInfo.firstSeen && (
                <div>
                  <div className="text-xs text-muted-foreground">首次访问</div>
                  <div className="font-medium">{ipInfo.firstSeen}</div>
                </div>
              )}
              {ipInfo.lastSeen && (
                <div>
                  <div className="text-xs text-muted-foreground">最近访问</div>
                  <div className="font-medium">{ipInfo.lastSeen}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 外部查询链接 */}
        <div className="pt-3 border-t border-border">
          <Button variant="ghost" size="sm" className="h-7 text-xs w-full justify-start" asChild>
            <a
              href={`https://ipinfo.io/${ipInfo.ip}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              在 IPInfo.io 查看更多
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
