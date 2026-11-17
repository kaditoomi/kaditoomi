import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Värskendab Supabase'i sessiooni küpsiseid igal päringul (Next 16: proxy = endine middleware).
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  // Vigane Supabase'i seadistus ei tohi kukutada kogu saiti: logi põhjus ja jätka.
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Värskendab aegunud sessiooni; kehtiva tõendi allkiri kontrollitakse kohapeal (kiire).
    await supabase.auth.getClaims();
  } catch (e) {
    console.error(
      "Supabase'i sessiooni värskendamine ebaõnnestus. Kontrolli NEXT_PUBLIC_SUPABASE_URL (kujul https://<ref>.supabase.co) " +
        "ja NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:",
      (e as Error).message,
    );
    return NextResponse.next({ request });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg).*)"],
};
