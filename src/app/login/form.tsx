"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="password">Mot de passe</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
      </div>
      {state.error && <p role="alert" className="text-sm font-medium text-rose-700">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
    </form>
  );
}
