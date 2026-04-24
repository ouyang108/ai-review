import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { map, Observable } from 'rxjs';

// 统一响应体结构
interface ResponseBody<T = unknown> {
  timestamp: string;
  path: string;
  message: string;
  code: number;
  success: boolean;
  data: T | null;
}

// 控制器返回值的约定结构
interface ControllerResult<T = unknown> {
  message?: string;
  code?: number;
  data?: T;
}

// 将 bigint 转换为字符串，Date 类型保持不变
const transformBigInt = (obj: unknown): unknown => {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(transformBigInt);
  }
  if (obj !== null && typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj;
    }
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, transformBigInt(value)]),
    );
  }
  return obj;
};

@Injectable()
export class InterceptorInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseBody> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();

    return next.handle().pipe(
      map((data: ControllerResult) => ({
        timestamp: new Date().toISOString(),
        path: request.url,
        message: data?.message ?? '请求成功',
        code: data?.code ?? 200,
        success: true,
        data: transformBigInt(data?.data) ?? null,
      })),
    );
  }
}
