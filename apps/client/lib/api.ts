const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
import type { AiFormState } from '@/types/setting';

// ── AI 设置 ──────────────────────────────────────────────────────────────────

/** 获取 AI 配置 */
export async function getAiSetting() {
  const res = await fetch(`${API_URL}/ai-setting`);
  if (!res.ok) throw new Error('获取AI设置失败');
  return res.json();
}

/** 更新 AI 配置 */
export async function updateAiSettings(updateAiSettingDto: AiFormState) {
  const res = await fetch(`${API_URL}/ai-setting/${updateAiSettingDto.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateAiSettingDto),
  });
  if (!res.ok) throw new Error('更新AI设置失败');
  return res.json();
}

// ── GitHub 设置 ──────────────────────────────────────────────────────────────

/** 获取 GitHub 配置 */
export async function getGithubConfig() {
  const res = await fetch(`${API_URL}/github/setting/config`);
  if (!res.ok) throw new Error('获取GitHub配置失败');
  return res.json();
}

/** 保存 GitHub 配置（upsert：存在则更新，不存在则创建） */
export async function saveGithubConfig(dto: {
  token: string;
  webhookSecret: string;
  defaultBranch: string;
  ignoredPaths: string;
  webhookUrl: string;
}) {
  const res = await fetch(`${API_URL}/github/setting/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) throw new Error('保存GitHub配置失败');
  return res.json();
}
