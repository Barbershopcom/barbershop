import { AuthGate } from '@/components/AuthGate';
import MeusAgendamentos from '../(app)/meus-agendamentos';

export default function AgendaTab() {
  return (
    <AuthGate message="Entre para ver seus agendamentos.">
      <MeusAgendamentos />
    </AuthGate>
  );
}
