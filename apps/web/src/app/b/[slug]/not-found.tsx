import Link from 'next/link';

export default function PublicTenantNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-semibold">Barbearia não encontrada</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        O link que você usou está incorreto ou a barbearia não está mais
        ativa. Confirme com quem te enviou.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Voltar
      </Link>
    </main>
  );
}
