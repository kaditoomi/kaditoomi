"use client";

import { sendMagicLink } from "@/app/actions/session";
import { ActionForm, SubmitButton } from "./forms";

export function MagicLinkForm() {
  return (
    <ActionForm action={sendMagicLink} className="space-y-3">
      <label className="block">
        <span className="label">Kooli e-posti aadress</span>
        <input name="email" type="email" required className="input" autoComplete="email" />
      </label>
      <SubmitButton>Saada sisselogimislink</SubmitButton>
    </ActionForm>
  );
}
