"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-utils";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

/**
 * Vorm, mis näitab serveritoimingu tulemust (viga või kinnitus).
 * Saadab andmed ise (mitte <form action>), sest React tühjendaks muidu vormi ka
 * ebaõnnestunud salvestuse järel ja kasutaja sisestus kaoks. Tühjendame ainult
 * eduka salvestuse järel ja ainult siis, kui resetOnSuccess on määratud.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
        const fd = new FormData(e.currentTarget, submitter);
        startTransition(() => formAction(fd));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      {!pending && state?.error && (
        <p role="alert" className="mt-2 rounded-md bg-s-red-bg px-2.5 py-1.5 text-sm text-s-red">
          {state.error}
        </p>
      )}
      {!pending && state?.ok && (
        <p role="status" className="mt-2 text-sm text-s-green">
          ✓ {state.ok}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  small,
}: {
  children: ReactNode;
  variant?: "primary" | "default" | "danger";
  small?: boolean;
}) {
  const pending = useContext(PendingContext);
  const cls = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn text-s-red" : "btn";
  return (
    <button type="submit" disabled={pending} className={`${cls} ${small ? "btn-sm" : ""}`}>
      {pending ? "Salvestan…" : children}
    </button>
  );
}
