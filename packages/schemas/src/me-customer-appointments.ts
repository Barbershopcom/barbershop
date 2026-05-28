/**
 * DTOs do endpoint `/me/customer-appointments` — usado pelo mobile-customer
 * (cliente logado vê suas reservas em todas as barbearias).
 *
 * Vinculação por `customerEmail = appUser.email` — não há userId no
 * Appointment (booking público é guest). Cliente que reserva com o mesmo
 * email do user logado pode ver/cancelar pelo app.
 */
export interface MyCustomerAppointmentItem {
  id: string;
  startAt: string;
  endAt: string;
  status: 'booked' | 'cancelled' | 'completed' | 'no_show';
  cancelledBy: 'customer' | 'admin' | 'system' | null;
  cancelReason: string | null;
  service: { id: string; name: string; durationMin: number };
  barber: { id: string; displayName: string };
  tenant: { id: string; slug: string; name: string; timezone: string };
}
