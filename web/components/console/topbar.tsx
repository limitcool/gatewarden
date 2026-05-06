"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Bell, User, Moon, Sun, Menu } from "lucide-react"
import { useTheme } from "next-themes"

interface TopbarProps {
  className?: string
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Topbar({ className, onMenuClick, showMenuButton = false }: TopbarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header
      className={cn(
        "flex items-center justify-between h-14 px-4 border-b border-border bg-background",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button variant="ghost" size="sm" onClick={onMenuClick} className="h-8 w-8 p-0 lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div className="relative hidden sm:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索规则、事件..."
            className="h-8 w-64 pl-8 text-sm bg-secondary border-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 relative"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-error" />
              <span className="sr-only">通知</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              通知
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">新规则待审批</span>
              <span className="text-xs text-muted-foreground">login-burst-throttle 等待审核</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
              <span className="text-sm font-medium">安全警报</span>
              <span className="text-xs text-muted-foreground">检测到异常访问模式</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-center text-muted-foreground">
              查看全部通知
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="hidden sm:inline-block text-sm">管理员</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">管理员</p>
                <p className="text-xs text-muted-foreground">admin@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>个人设置</DropdownMenuItem>
            <DropdownMenuItem>帮助文档</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">退出登录</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
