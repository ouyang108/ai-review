import { GithubSettings } from "./github-settings"
import { AiSettings } from "./ai-settings"
import { NotificationSettings } from "./notification-settings"

/** 设置页面：聚合所有配置模块 */
export default function SettingsPage() {
    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-xl font-semibold">设置</h1>
                <p className="text-sm text-muted-foreground">
                    管理 GitHub 集成、AI 模型及通知偏好
                </p>
            </div>

            {/* 各配置模块，限制最大宽度以保持可读性 */}
            <div className="flex flex-col gap-6 ">
                {/* GitHub 接入配置 */}
                <GithubSettings />

                {/* AI 模型配置 */}
                <AiSettings />

                {/* 通知设置 */}
                <NotificationSettings />
            </div>
        </div>
    )
}
