import { SidebarNav } from "@/components/sidebar-nav"

/**
 * (main) 路由组共享布局
 * 所有在此组内的路由均会渲染左侧侧边栏 + 右侧内容区结构
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // 整体布局：横向排列，左侧菜单栏 + 右侧内容区
    <div className="flex h-screen bg-zinc-50 font-sans dark:bg-black">
      {/* 左侧可折叠菜单栏 */}
      <SidebarNav />

      {/* 右侧内容区域 */}
      <div className="flex flex-1 flex-col overflow-auto">
        {children}
      </div>
    </div>
  )
}
