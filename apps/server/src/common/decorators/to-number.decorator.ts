import { applyDecorators } from '@nestjs/common';
import { Type, Transform } from 'class-transformer';

/**
 * 将请求字段转换为 number 类型的复合装饰器。
 * 空值（null / undefined / '' / 'null' / 'undefined'）统一转为 undefined，
 * 无法转换的值原样透传，由后续 @IsNumber() 负责报错。
 */
export function ToNumber(): PropertyDecorator & MethodDecorator {
  return applyDecorators(
    // 显式告知 class-transformer 目标类型
    Type(() => Number),
    // 核心清洗逻辑
    Transform(({ value }: { value: unknown }): number | undefined => {
      // 处理各种空值情况
      if (
        value === null ||
        value === undefined ||
        value === 'null' ||
        value === 'undefined' ||
        value === ''
      ) {
        return undefined;
      }

      const result = Number(value);

      // 如果转换结果是 NaN，保留原样返回，让后续的 @IsNumber() 装饰器去精准报错
      return isNaN(result) ? (value as number) : result;
    }),
  );
}
