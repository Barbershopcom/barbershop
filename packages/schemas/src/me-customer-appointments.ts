import type { AppointmentStatus } from './appointments';

/**
 * DTOs do endpoint `/me/customer-appointments` — usado pelo mobile-customer
 * (cliente logado vê suas reservas em todas as barbearias).
 *
 * Vínculo por customerId (account-linking) ou customerEmail (ADR-016 §2).
 */
export interface MyCustomerAppointmentItem {
  id: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  cancelledBy: 'customer' | 'admin' | 'system' | null;
  cancelReason: string | null;
  service: { id: string; name: string; durationMin: number };
  barber: { id: string; displayName: string };
  tenant: { id: string; slug: string; name: string; timezone: string };
}
