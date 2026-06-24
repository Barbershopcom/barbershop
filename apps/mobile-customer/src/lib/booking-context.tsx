import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { useTenant } from '@/lib/tenant-context';

export interface ServiceDetail {
  id: string;
  name: string;
  basePriceCents: number;
  durationMin: number;
}

export interface BookingState {
  barbershopId: string | null;
  barbershopName: string | null;
  barbershopSlug: string | null;
  selectedServiceIds: Set<string>;
  services: Map<string, ServiceDetail>; // serviceId -> { name, price, duration }
  selectedBarber: { id: string; displayName: string; ratingAvg?: number } | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  totalPrice: number;
  appointmentId: string | null;
  /**
   * Token HMAC de posse do agendamento (H3 secfix). Retornado pelo POST
   * de booking; deve ser passado como ?token= no POST /payment/pay.
   */
  paymentToken: string | null;
  /** Dados do cliente confirmados no checkout (vão no POST de booking). */
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  /** Payload do Pix retornado pelo POST /pay (renderizado na tela pix). */
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
}

interface BookingContextValue {
  state: BookingState;
  setBarbershop: (id: string, name: string, slug: string) => void;
  setAvailableServices: (services: ServiceDetail[]) => void;
  toggleService: (serviceId: string) => void;
  selectServices: (serviceIds: string[]) => void;
  setBarber: (id: string, name: string, ratingAvg?: number) => void;
  setDateTime: (date: Date, time: string) => void;
  setAppointmentId: (id: string) => void;
  setPaymentToken: (token: string | null) => void;
  setCustomer: (name: string, phone: string, email: string | null) => void;
  setPixPayload: (qrCode: string | null, qrCodeBase64: string | null) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking() deve ser usado dentro de <BookingProvider>');
  }
  return ctx;
}

const initialState: BookingState = {
  barbershopId: null,
  barbershopName: null,
  barbershopSlug: null,
  selectedServiceIds: new Set(),
  services: new Map(),
  selectedBarber: null,
  selectedDate: null,
  selectedTime: null,
  totalPrice: 0,
  appointmentId: null,
  paymentToken: null,
  customerName: null,
  customerPhone: null,
  customerEmail: null,
  pixQrCode: null,
  pixQrCodeBase64: null,
};

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);
  const tenant = useTenant();

  const setBarbershop = (id: string, name: string, slug: string) => {
    setState((prev) => ({
      ...prev,
      barbershopId: id,
      barbershopName: name,
      barbershopSlug: slug,
    }));
  };

  useEffect(() => {
    if (tenant.status === 'ready') {
      setBarbershop(tenant.tenant.barbershopId, tenant.tenant.name, tenant.tenant.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.status]);

  const setAvailableServices = (services: ServiceDetail[]) => {
    setState((prev) => {
      const serviceMap = new Map<string, ServiceDetail>();
      services.forEach((s) => serviceMap.set(s.id, s));
      return { ...prev, services: serviceMap };
    });
  };

  const toggleService = (serviceId: string) => {
    setState((prev) => {
      const newServices = new Set(prev.selectedServiceIds);
      if (newServices.has(serviceId)) {
        newServices.delete(serviceId);
      } else {
        newServices.add(serviceId);
      }
      // Calcula totalPrice baseado nos preços reais dos serviços
      const newTotal = Array.from(newServices).reduce((acc, id) => {
        const service = prev.services.get(id);
        return acc + (service?.basePriceCents || 0);
      }, 0);
      // Quando mudar serviços, reseta barbeiro, data, hora
      return {
        ...prev,
        selectedServiceIds: newServices,
        totalPrice: newTotal,
        selectedBarber: null,
        selectedDate: null,
        selectedTime: null,
      };
    });
  };

  const selectServices = (serviceIds: string[]) => {
    setState((prev) => {
      const newServices = new Set(serviceIds);
      const newTotal = Array.from(newServices).reduce((acc, id) => {
        const service = prev.services.get(id);
        return acc + (service?.basePriceCents || 0);
      }, 0);
      return {
        ...prev,
        selectedServiceIds: newServices,
        totalPrice: newTotal,
        selectedBarber: null,
        selectedDate: null,
        selectedTime: null,
      };
    });
  };

  const setBarber = (id: string, name: string, ratingAvg?: number) => {
    setState((prev) => ({
      ...prev,
      selectedBarber: { id, displayName: name, ratingAvg },
      // Reseta data/hora ao mudar barbeiro
      selectedDate: null,
      selectedTime: null,
    }));
  };

  const setDateTime = (date: Date, time: string) => {
    setState((prev) => ({
      ...prev,
      selectedDate: date,
      selectedTime: time,
    }));
  };

  const setAppointmentId = (id: string) => {
    setState((prev) => ({
      ...prev,
      appointmentId: id,
    }));
  };

  const setPaymentToken = (token: string | null) => {
    setState((prev) => ({
      ...prev,
      paymentToken: token,
    }));
  };

  const setCustomer = (name: string, phone: string, email: string | null) => {
    setState((prev) => ({
      ...prev,
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
    }));
  };

  const setPixPayload = (qrCode: string | null, qrCodeBase64: string | null) => {
    setState((prev) => ({
      ...prev,
      pixQrCode: qrCode,
      pixQrCodeBase64: qrCodeBase64,
    }));
  };

  const reset = () => {
    setState(initialState);
  };

  return (
    <BookingContext.Provider
      value={{ state, setBarbershop, setAvailableServices, toggleService, selectServices, setBarber, setDateTime, setAppointmentId, setPaymentToken, setCustomer, setPixPayload, reset }}
    >
      {children}
    </BookingContext.Provider>
  );
}
