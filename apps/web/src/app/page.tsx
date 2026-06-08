import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          Beta
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Barbearia v2</h1>
        <p className="max-w-xl text-balance text-muted-foreground sm:text-lg">
          Agendamento, equipe e pagamento numa única ferramenta para sua barbearia.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/descobrir">Descobrir barbearias</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
