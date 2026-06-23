import { AuthGate } from '@/components/AuthGate';
import PerfilScreen from '../../(app)/perfil';

export default function PerfilTab() {
  return (
    <AuthGate message="Entre para acessar seu perfil.">
      <PerfilScreen />
    </AuthGate>
  );
}
