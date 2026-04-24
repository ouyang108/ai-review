import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
// Prisma 7 通过工厂函数动态创建 PrismaClient 类，其值类型被 TypeScript 推断为 any。
// 通过此转型将 PrismaClient 值重新标注为带有正确实例类型的构造函数，
// 使 PrismaService 继承后可获得完整的属性类型推断（如 aiSettings）。
const TypedPrismaClient = PrismaClient as unknown as new (
  ...args: ConstructorParameters<typeof PrismaClient>
) => PrismaClient;

/**
 * 封装 PrismaClient，随 NestJS 生命周期自动连接和断开数据库。
 * 使用 @prisma/adapter-pg 驱动连接 PostgreSQL。
 */
@Injectable()
export class PrismaService
  extends TypedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    console.log(process.env.DATABASE_URL);
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }

  // 模块初始化时建立数据库连接
  async onModuleInit() {
    await this.$connect();
  }

  // 模块销毁时断开数据库连接，避免连接泄漏
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
