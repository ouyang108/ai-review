"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Bot } from "lucide-react"
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

import { getAiSetting, updateAiSettings } from "@/lib/api"
import type { AiFormState } from "@/types/setting"
import { toast } from "sonner"
// 查询所有用户
// const users = await prisma.user.findMany();



/** AI 服务商选项，custom 表示用户自定义服务商 */
const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "custom", label: "自定义服务商" },
] as const

type Provider = (typeof PROVIDERS)[number]["value"]

/** 各服务商对应的可选模型；custom 无预设模型列表，由用户自行填写 */
const MODELS: Record<Provider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  anthropic: [
    { value: "claude-opus-4-7", label: "Claude Opus 4.7" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat" },
    { value: "deepseek-coder", label: "DeepSeek Coder" },
  ],
  // 自定义服务商无内置模型，用户手动输入
  custom: [],
}

/** 默认系统提示词 */
const DEFAULT_SYSTEM_PROMPT =
  "你是一名专业的代码审查工程师，请对提交的 PR diff 进行详细的代码质量分析，包括：代码规范、潜在 Bug、性能问题、安全漏洞及可维护性，并给出改进建议。"



/** AI 模型设置卡片组件 */
export function AiSettings() {
  const [form, setForm] = useState<AiFormState>({
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4-6",
    baseUrl: "",
    temperature: "0.2",
    maxTokens: "4096",
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    customName: "",
    id: ''
  })
  /** 控制 API Key 明文显示 */
  const [showKey, setShowKey] = useState(false)
  /** 表单保存中状态 */
  const [saving, setSaving] = useState(false)

  /** 切换服务商时同步重置模型；自定义服务商清空模型，ollama 外均清空 API Key */
  function handleProviderChange(provider: Provider) {
    const firstModel = MODELS[provider][0]?.value ?? ""
    setForm((f) => ({
      ...f,
      provider,
      // 自定义服务商需用户手动填写模型名
      model: firstModel,
      // 切换服务商时清空 API Key，避免误用旧 Key
      apiKey: "",
      // 切换非自定义服务商时清空自定义名称
      customName: provider === "custom" ? (f.customName ?? "") : "",
    }))
  }

  /** 提交时调用 /api 接口 */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await updateAiSettings(form)
      if (res.code === 200) {
        toast("更新成功", { position: "top-center" })
      }
    } catch (err) {
      console.error("请求失败：", err)
    } finally {
      setSaving(false)
    }
  }

  /** 是否为自定义服务商模式 */
  const isCustom = form.provider === "custom"

  /** 需要显示 Base URL 的场景：Ollama 或自定义服务商 */
  const showBaseUrl = isCustom


  useEffect(() => {
    getAiSetting().then((data) => {

      setForm({
        ...form,
        ...data.data,
        id: data.data?.id ?? '',
        systemPrompt: data.data?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        customName: data.data?.customName ?? '',
        baseUrl: data.data?.baseUrl ?? '',
      })
    })

  }, [])

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <CardTitle>AI 模型配置</CardTitle>
        </div>
        <CardDescription>
          选择用于代码审查的 AI 服务商与模型，并配置相关参数
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="pt-4">
          <FieldGroup>
            {/* AI 服务商选择 */}
            <Field>
              <FieldLabel htmlFor="ai-provider">AI 服务商</FieldLabel>
              <select
                id="ai-provider"
                value={form.provider}
                onChange={(e) =>
                  handleProviderChange(e.target.value as Provider)
                }
                className="h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>

            {/* 自定义服务商名称（仅自定义服务商显示） */}
            {isCustom && (
              <Field>
                <FieldLabel htmlFor="ai-custom-name">服务商名称</FieldLabel>
                <FieldDescription>
                  用于标识该自定义服务商，例如：My LLM Service
                </FieldDescription>
                <Input
                  id="ai-custom-name"
                  type="text"
                  placeholder="例如：My LLM Service"
                  value={form.customName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customName: e.target.value }))
                  }
                  required={isCustom}
                />
              </Field>
            )}

            {/* API Key */}
            <Field>
              <FieldLabel htmlFor="ai-api-key">API Key</FieldLabel>
              <FieldDescription>
                请妥善保管，不要泄露到代码仓库中
              </FieldDescription>
              <div className="relative">
                <Input
                  id="ai-api-key"
                  type={showKey ? "text" : "password"}
                  placeholder={"sk-…"}
                  value={form.apiKey}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, apiKey: e.target.value }))
                  }

                  className="pr-9"
                  autoComplete="off"
                />
                {/* 切换 Key 可见性（Ollama 无 Key，不显示切换按钮） */}
                {(
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                  >
                    {showKey ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                )}
              </div>
            </Field>

            {/* Base URL（Ollama 或自定义服务商时显示） */}
            {showBaseUrl && (
              <Field>
                <FieldLabel htmlFor="ai-base-url">Base URL</FieldLabel>
                <FieldDescription>
                  "兼容 OpenAI 格式的 API 地址，例如 https://api.example.com/v1"
                </FieldDescription>
                <Input
                  id="ai-base-url"
                  type="url"
                  placeholder='https://api.example.com/v1'
                  value={form.baseUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, baseUrl: e.target.value }))
                  }
                  required={isCustom}
                />
              </Field>
            )}

            {/* 模型选择：自定义服务商用文本输入，其余用下拉 */}
            <Field>
              <FieldLabel htmlFor="ai-model">模型</FieldLabel>

              <FieldDescription>
                填写服务商支持的模型 ID，例如：gpt-4o、llama-3-70b
              </FieldDescription>
              <Input
                id="ai-model"
                type="text"
                placeholder="例如：gpt-4o"
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value }))
                }
                required={isCustom}
              />


            </Field>

            {/* 采样温度与最大 Token 并排显示 */}
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="ai-temperature">
                  温度（Temperature）
                </FieldLabel>
                <FieldDescription>0.0 – 2.0，越低越确定性</FieldDescription>
                <Input
                  id="ai-temperature"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={form.temperature}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, temperature: e.target.value }))
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="ai-max-tokens">最大 Tokens</FieldLabel>
                <FieldDescription>单次审查最多输出 Token 数</FieldDescription>
                <Input
                  id="ai-max-tokens"
                  type="number"
                  min={256}
                  max={32768}
                  step={256}
                  value={form.maxTokens}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTokens: e.target.value }))
                  }
                />
              </Field>
            </div>

            {/* 系统提示词 */}
            <Field>
              <FieldLabel htmlFor="ai-system-prompt">系统提示词</FieldLabel>
              <FieldDescription>
                发送给模型的角色设定，影响审查风格与关注点
              </FieldDescription>
              <textarea
                id="ai-system-prompt"
                rows={5}
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, systemPrompt: e.target.value }))
                }
                className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              />
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setForm((f) => ({ ...f, systemPrompt: DEFAULT_SYSTEM_PROMPT }))
            }
          >
            恢复默认提示词
          </Button>
          <Button type="submit" disabled={saving} >
            {saving ? "保存中…" : "保存配置"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
