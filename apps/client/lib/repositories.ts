const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

/** 仓库列表项 */
export interface RepositoryItem {
  id: number;
  name: string;
  owner: string;
  fullName: string;
  url: string;
  platform: string;
  isActive: boolean;
  /** 关联的 PR 总数 */
  prCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 获取所有仓库列表 */
export async function getRepositories(): Promise<{ data: RepositoryItem[] }> {
  const res = await fetch(`${API_URL}/repositories`, { cache: 'no-store' });
  if (!res.ok) throw new Error('获取仓库列表失败');
  return res.json();
}
