import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/**
 * Pipe que valida o input contra um schema Zod e devolve o parse tipado.
 *
 *   @Post()
 *   create(@Body(new ZodValidationPipe(mySchema)) body: z.infer<typeof mySchema>) { ... }
 *
 * Em caso de erro, 400 com `{ message, errors: { campo: [msg] } }`.
 */
@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
    }
    return result.data;
  }
}
