'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Check, GitBranch } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldDescription, FieldGroup } from '@/components/ui/field';

/** Webhook 回调地址（静态示例，实际应从服务端读取） */
// const WEBHOOK_URL = "https://your-domain.com/api/webhooks/github"

/** GitHub 配置表单状态 */
interface GithubFormState {
  /** GitHub Personal Access Token */
  token: string;
  /** Webhook 签名密钥 */
  webhookSecret: string;
  /** 默认审查分支 */
  defaultBranch: string;
  /** 忽略的文件路径（换行分隔） */
  ignoredPaths: string;
  /** Webhook 回调地址 */
  webhookUrl: string;
}

/** GitHub 设置卡片组件 */
export function GithubSettings() {
  const [form, setForm] = useState<GithubFormState>({
    token: '',
    webhookSecret: '',
    defaultBranch: 'main',
    webhookUrl: '',
    ignoredPaths: '*.lock\nnode_modules/\ndist/',
  });
  /** 控制 Token 明文显示 */
  const [showToken, setShowToken] = useState(false);
  /** 控制 Secret 明文显示 */
  const [showSecret, setShowSecret] = useState(false);
  /** Webhook URL 复制状态 */
  const [copied, setCopied] = useState(false);
  /** 表单保存中状态 */
  const [saving, setSaving] = useState(false);

  /** 复制 Webhook URL 到剪贴板 */
  function handleCopyWebhook() {
    navigator.clipboard.writeText(form.webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /** 模拟保存表单（替换为真实 API 调用） */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 text-muted-foreground" />
          <CardTitle>GitHub 配置</CardTitle>
        </div>
        <CardDescription>配置 GitHub 访问凭证与 Webhook，用于自动触发 PR 代码审查</CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="pt-4">
          <FieldGroup>
            {/* Personal Access Token */}
            <Field>
              <FieldLabel htmlFor="gh-token">Personal Access Token</FieldLabel>
              <FieldDescription>
                需要 <code className="text-xs">repo</code> 与{' '}
                <code className="text-xs">read:org</code> 权限
              </FieldDescription>
              <div className="relative">
                <Input
                  id="gh-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={form.token}
                  onChange={(e) => setForm((f) => ({ ...f, token: e.target.value }))}
                  className="pr-9"
                  autoComplete="off"
                />
                {/* 切换 Token 可见性 */}
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showToken ? '隐藏 Token' : '显示 Token'}
                >
                  {showToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </Field>

            {/* Webhook 回调地址（只读，供复制） */}
            <Field>
              <FieldLabel htmlFor="gh-webhook-url">Webhook 回调地址</FieldLabel>
              <FieldDescription>将此地址填入 GitHub 仓库的 Webhook 配置中</FieldDescription>
              <div className="relative">
                <Input
                  id="gh-webhook-url"
                  value={form.webhookUrl}
                  placeholder="https://your-domain.com/api/webhooks/github"
                  onChange={(e) => setForm((f) => ({ ...f, webhookUrl: e.target.value }))}
                  className="pr-9 font-mono text-xs text-muted-foreground"
                />
                {/* 复制按钮 */}
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="复制 Webhook 地址"
                >
                  {copied ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </Field>

            {/* Webhook 签名密钥 */}
            <Field>
              <FieldLabel htmlFor="gh-webhook-secret">Webhook Secret</FieldLabel>
              <FieldDescription>与 GitHub Webhook 页面中设置的 Secret 保持一致</FieldDescription>
              <div className="relative">
                <Input
                  id="gh-webhook-secret"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="自定义密钥字符串"
                  value={form.webhookSecret}
                  onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
                  className="pr-9"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showSecret ? '隐藏 Secret' : '显示 Secret'}
                >
                  {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </Field>

            {/* 默认分支 */}
            <Field>
              <FieldLabel htmlFor="gh-default-branch">默认目标分支</FieldLabel>
              <FieldDescription>仅对 PR 合并至此分支时触发自动审查</FieldDescription>
              <Input
                id="gh-default-branch"
                placeholder="main"
                value={form.defaultBranch}
                onChange={(e) => setForm((f) => ({ ...f, defaultBranch: e.target.value }))}
              />
            </Field>

            {/* 忽略路径 */}
            <Field>
              <FieldLabel htmlFor="gh-ignored-paths">忽略文件路径（每行一条）</FieldLabel>
              <FieldDescription>匹配以下 glob 规则的文件变更将不参与 AI 审查</FieldDescription>
              <textarea
                id="gh-ignored-paths"
                rows={4}
                placeholder={'*.lock\nnode_modules/\ndist/'}
                value={form.ignoredPaths}
                onChange={(e) => setForm((f) => ({ ...f, ignoredPaths: e.target.value }))}
                className="w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-1.5 font-mono text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30"
              />
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline">
            重置
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? '保存中…' : '保存配置'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
