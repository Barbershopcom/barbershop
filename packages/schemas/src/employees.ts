import { z } from 'zod';

// 'barber' | 'admin' | 'admin_barber' — string aberto pra evolução,
// validado contra enum no schema.
export const employeeRoles = ['admin', 'barber', 'admin_barber'] as const;
export type EmployeeRole = (typeof employeeRoles)[number];

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

export const createEmployeeSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: emptyToUndefined(z.string().email().optional()),
  role: z.enum(employeeRoles),
  isActive: z.boolean().optional().default(true),
});

export const updateEmployeeSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  email: emptyToUndefined(z.string().email().nullish()),
  role: z.enum(employeeRoles).optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema restrito pra self-edit no mobile (PATCH /me/employee).
 * Barbeiro só pode mudar campos do próprio perfil — role/isActive são
 * gerenciados pelo admin via web. Email é tied to auth (Supabase).
 */
export const updateMyEmployeeSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateMyEmployeeInput = z.infer<typeof updateMyEmployeeSchema>;

export interface EmployeeDto {
  id: string;
  displayName: string;
  email: string | null;
  role: EmployeeRole;
  isActive: boolean;
  appUserId: string | null;
  barbershopId: string;
  createdAt: string;
  updatedAt: string;
}
