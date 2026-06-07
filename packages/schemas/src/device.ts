import { z } from 'zod';

/** Registro de device push (ADR-017 §6). Usado por /me/devices (barbeiro). */
export const registerDeviceSchema = z.object({
  expoPushToken: z.string().min(1).max(255),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
