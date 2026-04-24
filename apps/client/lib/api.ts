const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';
import type { AiFormState } from '@/types/setting';
export async function updateAiSettings(updateAiSettingDto: AiFormState) {
  const res = await fetch(`${API_URL}/ai-setting/${updateAiSettingDto.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateAiSettingDto),
  });
  if (!res.ok) throw new Error('更新AI设置失败');
  return res.json();
}
export async function getAiSetting() {
  const res = await fetch(`${API_URL}/ai-setting`);
  if (!res.ok) throw new Error('获取AI设置失败');
  return res.json();
}
