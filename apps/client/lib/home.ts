const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1';

/** 仪表盘统计快照 */
export interface DashboardSnapshot {
  totalReviews: number;
  monthlyReviews: number;
  /** 通过率 0–100 */
  passRate: number;
  /** 平均得分 0–100 */
  avgScore: number;
  pendingCount: number;
  repoCount: number;
  scoreExcellent: number;
  scoreGood: number;
  scoreFair: number;
  scorePoor: number;
  triggerWebhook: number;
  triggerGitlabCi: number;
  triggerManual: number;
  triggerApi: number;
  snapshotAt: string;
  updatedAt: string;
}

/** 最近审查列表项 */
export interface RecentReviewItem {
  id: number;
  repo: string;
  title: string;
  status: 'passed' | 'rejected' | 'error';
  score: number | null;
  reviewedAt: string;
}

/** 获取仪表盘快照（统计卡片 + 质量分布 + 触发来源） */
export async function getDashboardSnapshot(): Promise<{ data: DashboardSnapshot | null }> {
  const res = await fetch(`${API_URL}/dashboard`, { cache: 'no-store' });
  if (!res.ok) throw new Error('获取仪表盘快照失败');
  return res.json();
}

/** 获取最近审查列表，limit 默认 5，最大 50 */
export async function getRecentReviews(limit = 5): Promise<{ data: RecentReviewItem[] }> {
  const res = await fetch(`${API_URL}/dashboard/recent-reviews?limit=${limit}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('获取最近审查列表失败');
  return res.json();
}
