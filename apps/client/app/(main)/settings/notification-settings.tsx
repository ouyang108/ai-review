"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field"

/** 通知事件类型 */
interface NotifyEvent {
  /** 事件 key */
  key: string
  /** 展示名称 */
  label: string
  /** 说明文字 */
  desc: string
}

/** 支持通知的事件列表 */
const NOTIFY_EVENTS: NotifyEvent[] = [
  {
    key: "reviewPassed",
    label: "审查通过",
    desc: "PR 代码质量达标，AI 审查结论为通过时发送通知",
  },
  {
    key: "reviewFailed",
    label: "审查拒绝",
    desc: "PR 存在严重问题，AI 审查建议拒绝合并时发送通知",
  },
  {
    key: "reviewError",
    label: "审查失败（系统错误）",
    desc: "调用 AI 服务或 GitHub API 出现异常时发送通知",
  },
  {
    key: "newPending",
    label: "新的待审查 PR",
    desc: "有新 PR 进入待审查队列时发送通知",
  },
]

/** 通知设置表单状态 */
interface NotifyFormState {
  /** 是否开启邮件通知 */
  emailEnabled: boolean
  /** 接收通知的邮箱地址 */
  email: string
  /** 各事件开关，key 对应 NotifyEvent.key */
  events: Record<string, boolean>
}

/** 通知设置卡片组件 */
export function NotificationSettings() {
  const [form, setForm] = useState<NotifyFormState>({
    emailEnabled: false,
    email: "",
    events: {
      reviewPassed: true,
      reviewFailed: true,
      reviewError: true,
      newPending: false,
    },
  })
  const [saving, setSaving] = useState(false)

  /** 切换单个事件通知开关 */
  function toggleEvent(key: string) {
    setForm((f) => ({
      ...f,
      events: { ...f.events, [key]: !f.events[key] },
    }))
  }

  /** 模拟保存（替换为真实 API 调用） */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-muted-foreground" />
          <CardTitle>通知设置</CardTitle>
        </div>
        <CardDescription>配置审查结果的邮件通知方式与触发事件</CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="pt-4">
          <FieldGroup>
            {/* 邮件通知总开关 */}
            <Field orientation="horizontal">
              <div className="flex flex-1 flex-col gap-0.5">
                <FieldLabel htmlFor="notify-email-enabled">
                  开启邮件通知
                </FieldLabel>
                <FieldDescription>
                  审查完成后将结果发送至指定邮箱
                </FieldDescription>
              </div>
              {/* 原生 checkbox，后续可换为 Switch 组件 */}
              <input
                id="notify-email-enabled"
                type="checkbox"
                role="switch"
                checked={form.emailEnabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emailEnabled: e.target.checked }))
                }
                className="mt-0.5 size-4 cursor-pointer accent-primary"
              />
            </Field>

            {/* 收件邮箱，仅当总开关开启时可编辑 */}
            <Field>
              <FieldLabel htmlFor="notify-email">接收邮箱</FieldLabel>
              <FieldDescription>多个邮箱请用英文逗号分隔</FieldDescription>
              <Input
                id="notify-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                disabled={!form.emailEnabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </Field>

            {/* 通知事件列表 */}
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-sm font-medium">通知事件</legend>
              {NOTIFY_EVENTS.map((ev) => (
                <div
                  key={ev.key}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{ev.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {ev.desc}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    role="switch"
                    id={`notify-ev-${ev.key}`}
                    checked={form.events[ev.key] ?? false}
                    disabled={!form.emailEnabled}
                    onChange={() => toggleEvent(ev.key)}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={ev.label}
                  />
                </div>
              ))}
            </fieldset>
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline">
            重置
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存配置"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
