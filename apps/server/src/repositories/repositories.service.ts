import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RepositoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 查询所有仓库，附带 PR 数量统计，按接入时间倒序 */
  async findAll() {
    const list = await this.prisma.repository.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { pullRequests: true } },
      },
    });

    return {
      data: list.map((r) => ({
        id: r.id,
        name: r.name,
        owner: r.owner,
        fullName: r.fullName,
        url: r.url,
        platform: r.platform,
        isActive: r.isActive,
        prCount: r._count.pullRequests,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };
  }
}
