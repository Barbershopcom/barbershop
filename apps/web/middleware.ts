import { type NextRequest, NextResponse } from 'next/server';
import { type CookieOptions, createServerClient } from '@supabase/ssr';

// Rotas públicas que não requerem autenticação
const PUBLIC_ROUTES = ['/login', '/signup', '/auth'];

// Rotas protegidas que requerem autenticação
const PROTECTED_ROUTES = ['/admin', '/dashboard', '/painel'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Se for rota pública, deixa passar
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Se for rota protegida, verifica autenticação
  if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
              const response = NextResponse.next();
              cookies.forEach((cookie) => response.cookies.set(cookie));
              return response;
            },
          },
        },
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Se não há usuário autenticado, redireciona para login
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
      }

      return NextResponse.next();
    } catch (error) {
      // Se houver erro ao verificar autenticação, redireciona para login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // Para outras rotas, deixa passar
  return NextResponse.next();
}

export const config = {
  // Matcher: rotas que devem passar pelo middleware
  matcher: [
    /*
     * Rotas a proteger:
     * - /admin/*
     * - /dashboard/*
     * - /painel/*
     *
     * Excluir:
     * - /_next/static (assets Next.js)
     * - /_next/image (otimização de imagens)
     * - /favicon.ico
     * - /api/* (APIs podem ter suas próprias verificações)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
