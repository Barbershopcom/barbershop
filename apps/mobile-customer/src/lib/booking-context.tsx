import { createContext, useContext, useState, type ReactNode } from 'react';

export interface BookingState {
  barbershopId: string | null;
  barbershopName: string | null;
  barbershopSlug: string | null;
  selectedServiceIds: Set<string>;
  selectedBarber: { id: string; displayName: string; ratingAvg?: number } | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  totalPrice: number;
  appointmentId: string | null;
}

interface BookingContextValue {
  state: BookingState;
  setBarbershop: (id: string, name: string, slug: string) => void;
  toggleService: (serviceId: string, price: number) => void;
  setBarber: (id: string, name: string, ratingAvg?: number) => void;
  setDateTime: (date: Date, time: string) => void;
  setAppointmentId: (id: string) => void;
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
  selectedBarber: null,
  selectedDate: null,
  selectedTime: null,
  totalPrice: 0,
  appointmentId: null,
};

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookingState>(initialState);

  const setBarbershop = (id: string, name: string, slug: string) => {
    setState((prev) => ({
      ...prev,
      barbershopId: id,
      barbershopName: name,
      barbershopSlug: slug,
    }));
  };

  const toggleService = (serviceId: string, price: number) => {
    setState((prev) => {
      const newServices = new Set(prev.selectedServiceIds);
      if (newServices.has(serviceId)) {
        newServices.delete(serviceId);
      } else {
        newServices.add(serviceId);
      }
      // Quando mudar serviços, reseta barbeiro, data, hora
      return {
        ...prev,
        selectedServiceIds: newServices,
        selectedBarber: null,
        selectedDate: null,
        selectedTime: null,
        totalPrice: Array.from(newServices).reduce((acc, id) => {
          // Nota: isso é simplificado; em produção você buscaria o preço real do serviço
          return acc + price;
        }, 0),
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

  const reset = () => {
    setState(initialState);
  };

  return (
    <BookingContext.Provider
      value={{ state, setBarbershop, toggleService, setBarber, setDateTime, setAppointmentId, reset }}
    >
      {children}
    </BookingContext.Provider>
  );
}
