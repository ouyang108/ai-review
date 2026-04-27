'use client';

import { useEffect, useState } from 'react';
import { getGithubConfig, saveGithubConfig } from '@/lib/api';
import { toast } from 'sonner';

export interface GithubFormState {
  token: string;
  webhookSecret: string;
  defaultBranch: string;
  ignoredPaths: string;
  webhookUrl: string;
}

const DEFAULT_FORM: GithubFormState = {
  token: '',
  webhookSecret: '',
  defaultBranch: 'main',
  webhookUrl: '',
  ignoredPaths: '*.lock\nnode_modules/\ndist/',
};

export function useGithubSettings() {
  const [form, setForm] = useState<GithubFormState>(DEFAULT_FORM);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  /** 挂载时从服务端回显已保存的 GitHub 配置 */
  useEffect(() => {
    getGithubConfig()
      .then((res) => {
        if (res.data) {
          setForm({
            token: res.data.token ?? '',
            webhookSecret: res.data.webhookSecret ?? '',
            defaultBranch: res.data.defaultBranch ?? 'main',
            webhookUrl: res.data.webhookUrl ?? '',
            ignoredPaths: res.data.ignoredPaths ?? DEFAULT_FORM.ignoredPaths,
          });
        }
      })
      .catch(console.error);
  }, []);

  /** 复制 Webhook URL 到剪贴板 */
  function handleCopyWebhook() {
    navigator.clipboard.writeText(form.webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  /** 调用接口保存 GitHub 配置 */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveGithubConfig(form);
      if (res.code === 200) {
        toast('更新成功', { position: 'top-center' });
      }
    } catch (err) {
      console.error('保存GitHub配置失败：', err);
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    setForm,
    showToken,
    setShowToken,
    showSecret,
    setShowSecret,
    copied,
    saving,
    handleCopyWebhook,
    handleSave,
  };
}
