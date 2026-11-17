"use client";

// Kuvatakse, kui lehe laadimine serveris ebaõnnestub (nt andmebaasiühendus).
// Täpne põhjus on serveri logis (Vercel → Logs); kasutajale tehnilisi detaile ei näidata.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-10 max-w-lg card p-6">
      <h1 className="text-lg font-semibold">Lehte ei õnnestunud laadida</h1>
      <p className="mt-2 text-sm text-ink-2">
        Serveris tekkis viga (näiteks ei saadud ühendust andmebaasiga). Proovi uuesti. Kui viga kordub, vaata
        administraatorina Verceli logisid{error.digest ? ` (viite kood: ${error.digest})` : ""}.
      </p>
      <button className="btn mt-4" onClick={() => reset()}>
        Proovi uuesti
      </button>
    </div>
  );
}
