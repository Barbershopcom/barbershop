import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-accent/60 bg-secondary px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
          Beta
        </span>
        <h1 className="font-display text-6xl tracking-wide text-primary sm:text-8xl">NAVALHA</h1>
        <p className="max-w-xl text-balance font-serif text-lg italic text-muted-foreground">
          Seu corte, na hora certa. Agendamento, equipe e pagamento numa única
          ferramenta para sua barbearia.
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
