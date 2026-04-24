"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  HomeIcon,
  FolderGit2Icon,
  GitPullRequestIcon,
  SettingsIcon,
  UsersIcon,
  BarChartIcon,
} from "lucide-react"

/** 子菜单项定义 */
interface SubMenuItem {
  label: string
  href?: string
}

/** 菜单项定义 */
interface MenuItem {
  label: string
  icon: React.ReactNode
  href?: string
  children?: SubMenuItem[]
}

/** SidebarNav 组件 Props */
interface SidebarNavProps {
  className?: string
}

/** 默认菜单配置 */
const MENU_ITEMS: MenuItem[] = [
  {
    label: "首页",
    icon: <HomeIcon />,
    href: "/home",
  },
  {
    label: "代码审查",
    icon: <GitPullRequestIcon />,
    children: [
      { label: "待审查", href: "/review/pending" },
      { label: "已完成", href: "/review/done" },
      { label: "我的提交", href: "/review/mine" },
    ],
  },
  {
    label: "仓库管理",
    icon: <FolderGit2Icon />,

  },
  {
    label: "统计报告",
    icon: <BarChartIcon />,
    href: "/reports",
  },
  {
    label: "团队成员",
    icon: <UsersIcon />,
    href: "/members",
  },
  {
    label: "设置",
    icon: <SettingsIcon />,
    href: "/settings",
  },
]

/**
 * 垂直侧边栏导航组件
 * 支持折叠/展开，子菜单展开/收起
 */
export function SidebarNav({ className }: SidebarNavProps) {
  // 侧边栏整体折叠状态
  const [collapsed, setCollapsed] = React.useState(false)
  // 记录哪些子菜单处于展开状态（存储菜单 label）
  const [openMenus, setOpenMenus] = React.useState<Set<string>>(new Set())

  /** 切换子菜单展开/收起 */
  const toggleSubMenu = (label: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      return next
    })
  }

  /** 折叠侧边栏时同时关闭所有子菜单 */
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      if (!prev) setOpenMenus(new Set())
      return !prev
    })
  }

  return (
    <aside
      data-slot="sidebar-nav"
      className={cn(
        // 基础布局：纵向 flex，高度撑满，带边框和过渡动画
        "relative flex flex-col h-full border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-14" : "w-56",
        className
      )}
    >
      {/* 顶部 Logo / 标题区域 */}
      <div
        className={cn(
          "flex h-12 items-center border-b border-border px-3",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="text-sm font-semibold truncate">AI Review</span>
        )}
        {/* 折叠/展开切换按钮 */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "展开菜单" : "折叠菜单"}
          className="flex cursor-pointer size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="size-4" />
          ) : (
            <ChevronLeftIcon className="size-4" />
          )}
        </button>
      </div>

      {/* 菜单列表 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <ul className="flex flex-col gap-0.5 px-2">
          {MENU_ITEMS.map((item) => {
            const hasChildren = !!item.children?.length
            const isOpen = openMenus.has(item.label)

            /** 菜单项内容（图标 + 文字 + 箭头） */
            const itemContent = (
              <>
                <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 truncate text-left">{item.label}</span>
                    {hasChildren && (
                      <ChevronDownIcon
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    )}
                  </>
                )}
              </>
            )

            /** 共用样式 */
            const itemCls = cn(
              "group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "transition-colors outline-none",
              collapsed && "justify-center px-0"
            )

            return (
              <li key={item.label}>
                {/* 有 href 的顶级菜单项：使用 Link 路由跳转 */}
                {/* 有子菜单的顶级菜单项：使用 button 控制展开/收起 */}
                {hasChildren ? (
                  <button
                    onClick={() => !collapsed && toggleSubMenu(item.label)}
                    title={collapsed ? item.label : undefined}
                    className={itemCls}
                  >
                    {itemContent}
                  </button>
                ) : (
                  <Link
                    href={item.href ?? "/"}
                    title={collapsed ? item.label : undefined}
                    className={itemCls}
                  >
                    {itemContent}
                  </Link>
                )}

                {/* 子菜单（仅展开且有子项时渲染） */}
                {hasChildren && !collapsed && isOpen && (
                  <ul className="mt-0.5 flex flex-col gap-0.5 pl-6">
                    {item.children!.map((child) => (
                      <li key={child.label}>
                        <Link
                          href={child.href ?? "/"}
                          className={cn(
                            "flex w-full items-center rounded-md px-2 py-1 text-sm",
                            "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            "transition-colors outline-none"
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
