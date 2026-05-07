"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SettingsFormValues {
  subjectHeader: string
  emailHeader: string
  locale: "en" | "zh-CN"
  notes: string
  shadowModeEnabled: boolean
}

interface SettingsFormCardProps {
  settings: SettingsFormValues
  onSettingsChange?: (settings: SettingsFormValues) => void
  onSave?: (settings: SettingsFormValues) => void
  onReset?: () => void
  activeSection?: "basic" | "integrations" | "alerts" | "advanced"
  className?: string
  isLoading?: boolean
}

export function SettingsFormCard({
  settings,
  onSettingsChange,
  onSave,
  onReset,
  activeSection = "basic",
  className,
  isLoading = false,
}: SettingsFormCardProps) {
  const handleChange = (key: keyof SettingsFormValues, value: string | boolean) => {
    const newSettings = { ...settings, [key]: value }
    onSettingsChange?.(newSettings)
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">运行时覆盖项</h3>
        <p className="text-xs text-muted-foreground mt-0.5">这里只能修改少量运行时覆盖项，不是 gatewarden.yaml 的完整一对一编辑器。</p>
      </div>
      <div className="p-4 space-y-6">
        {(activeSection === "basic" || activeSection === "integrations") && (
          <>
            <div className="space-y-2">
              <Label htmlFor="subjectHeader" className="text-sm">主体标识 Header</Label>
              <Input
                id="subjectHeader"
                value={settings.subjectHeader}
                onChange={(e) => handleChange("subjectHeader", e.target.value)}
                placeholder="Remote-User"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">用于识别请求主体的 HTTP Header 名称</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailHeader" className="text-sm">邮箱标识 Header</Label>
              <Input
                id="emailHeader"
                value={settings.emailHeader}
                onChange={(e) => handleChange("emailHeader", e.target.value)}
                placeholder="Remote-Email"
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">用于识别用户邮箱的 HTTP Header 名称</p>
            </div>
          </>
        )}

        {(activeSection === "basic" || activeSection === "advanced") && (
          <div className="space-y-2">
            <Label htmlFor="locale" className="text-sm">系统语言</Label>
            <Select
              value={settings.locale}
              onValueChange={(value) => handleChange("locale", value as "en" | "zh-CN")}
            >
              <SelectTrigger id="locale" className="h-9">
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(activeSection === "integrations" || activeSection === "advanced") && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">备注信息</Label>
            <Textarea
              id="notes"
              value={settings.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="记录当前身份接入方式、回滚说明或风险备注..."
              rows={4}
              className="resize-none"
            />
          </div>
        )}

        {(activeSection === "alerts" || activeSection === "advanced") && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="space-y-0.5">
                <Label htmlFor="shadowMode" className="text-sm">影子模式</Label>
                <p className="text-xs text-muted-foreground">启用后新规则默认进入影子模式，先观察命中再决定是否强制。</p>
              </div>
              <Switch
                id="shadowMode"
                checked={settings.shadowModeEnabled}
                onCheckedChange={(checked) => handleChange("shadowModeEnabled", checked)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
        <Button variant="outline" size="sm" className="h-8" onClick={onReset}>
          重置
        </Button>
        <Button
          size="sm"
          className="h-8"
          onClick={() => onSave?.(settings)}
          disabled={isLoading}
        >
          {isLoading ? "保存中..." : "保存更改"}
        </Button>
      </div>
    </div>
  )
}
