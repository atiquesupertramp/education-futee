"use client";

import { useActionState, useState } from "react";
import { updatePaymentAction, type PaymentState } from "@/app/actions";

export function PaymentForm({ studentId, type, amount }: { studentId: string; type: "mensuel" | "unique" | null; amount: number | string | null }) {
  const [state, action, pending] = useActionState<PaymentState, FormData>(updatePaymentAction, undefined);
  const [payType, setPayType] = useState<"" | "mensuel" | "unique">(type ?? "");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="student_id" value={studentId} />
      <div>
        <label className="label" htmlFor="payment_type">Type de paiement</label>
        <select className="input" id="payment_type" name="payment_type" value={payType} onChange={(e) => setPayType(e.target.value as "" | "mensuel" | "unique")}>
          <option value="">Non indiqué</option>
          <option value="mensuel">Paiement mensuel</option>
          <option value="unique">Paiement unique</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="payment_amount">{payType === "mensuel" ? "Montant par mois ($)" : payType === "unique" ? "Montant total ($)" : "Montant ($)"}</label>
        <input
          className="input"
          id="payment_amount"
          name="payment_amount"
          inputMode="decimal"
          defaultValue={amount == null ? "" : String(amount).replace(".", ",")}
          placeholder="Ex. : 149,00"
          required={!!payType}
          disabled={!payType}
        />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      {state?.saved && !pending && <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">Paiement enregistré.</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer le paiement"}</button>
      <p className="text-xs text-stone-500">Le montant est compté dans les totaux du tableau de bord (revenu mensuel pour les élèves actifs, paiements uniques).</p>
    </form>
  );
}
