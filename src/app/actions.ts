"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, must } from "@/lib/db";
import {
  advanceClock,
  confirmByToken,
  createStudent,
  markCallDone,
  processDue,
  resendWelcome,
  resetDemo,
} from "@/lib/onboarding";
import { parseGroupCode } from "@/lib/labels";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export type FormState = { error?: string } | undefined;

export async function createStudentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  let id: string;
  try {
    const cycle = Number(fd.get("cycle"));
    if (cycle !== 2 && cycle !== 3) return { error: "Choisissez le cycle." };
    id = await createStudent({
      parent_name: str(fd, "parent_name"),
      parent_email: str(fd, "parent_email"),
      parent_phone: str(fd, "parent_phone"),
      first_name: str(fd, "first_name"),
      grade: str(fd, "grade"),
      cycle,
      start_date: str(fd, "start_date"),
      end_date: str(fd, "end_date"),
      closer_name: str(fd, "closer_name"),
      group_codes: fd.getAll("group_codes").map(String),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
  revalidatePath("/", "layout");
  redirect(`/eleves/${id}?nouveau=1`);
}

export async function advanceClockAction(fd: FormData) {
  const hours = Number(fd.get("hours") ?? 24);
  await advanceClock(Number.isFinite(hours) && hours > 0 ? hours : 24);
  revalidatePath("/", "layout");
}

export async function runFollowupsAction() {
  await processDue();
  revalidatePath("/", "layout");
}

export async function confirmManualAction(fd: FormData) {
  await confirmByToken(str(fd, "token"), str(fd, "via") === "reponse" ? "reponse" : "manuel");
  revalidatePath("/", "layout");
}

export async function resendWelcomeAction(fd: FormData) {
  await resendWelcome(str(fd, "enrollment_id"));
  revalidatePath("/", "layout");
}

export async function callDoneAction(fd: FormData) {
  await markCallDone(str(fd, "student_id"), str(fd, "notes"));
  revalidatePath("/", "layout");
}

export async function updateMembershipAction(fd: FormData) {
  const id = str(fd, "student_id");
  const status = str(fd, "membership_status");
  must(
    await db()
      .from("students")
      .update({
        membership_status: ["actif", "en_pause", "termine"].includes(status) ? status : "actif",
        start_date: str(fd, "start_date") || null,
        end_date: str(fd, "end_date") || null,
        notes: str(fd, "notes") || null,
      })
      .eq("id", id),
    "Mise à jour de l'abonnement",
  );
  await db().from("events").insert({ student_id: id, type: "abonnement", detail: `Abonnement mis à jour : ${status}` });
  revalidatePath("/", "layout");
}

export async function deleteStudentAction(fd: FormData) {
  must(await db().from("students").delete().eq("id", str(fd, "student_id")), "Suppression");
  revalidatePath("/", "layout");
  redirect("/eleves");
}

export async function saveGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const original = str(fd, "original_code");
  const code = str(fd, "code").toUpperCase().replace(/\s+/g, "");
  const parsed = parseGroupCode(code);
  if (!parsed) return { error: "Code invalide. Format attendu : 2-L-01, 3-M-02, 2CF-E-01, 3CF-L-03…" };
  const row = {
    code,
    program: parsed.program,
    cycle: parsed.cycle,
    subject: parsed.subject,
    teacher: str(fd, "teacher") || null,
    day: str(fd, "day") || null,
    time: str(fd, "time") || null,
    zoom_url: str(fd, "zoom_url") || null,
    zoom_id: str(fd, "zoom_id") || null,
    zoom_password: str(fd, "zoom_password") || null,
    active: fd.get("active") === "on",
    notes: str(fd, "notes") || null,
    updated_at: new Date().toISOString(),
  };
  const res = original
    ? await db().from("groups").update(row).eq("code", original)
    : await db().from("groups").insert(row);
  if (res.error) {
    return { error: res.error.code === "23505" ? `Le groupe ${code} existe déjà.` : res.error.message };
  }
  revalidatePath("/", "layout");
  redirect("/groupes");
}

export async function saveSettingsAction(fd: FormData) {
  must(
    await db()
      .from("settings")
      .update({ sender_email: str(fd, "sender_email"), reply_to: str(fd, "reply_to"), va_email: str(fd, "va_email") })
      .eq("id", 1),
    "Paramètres",
  );
  revalidatePath("/", "layout");
}

export async function resetDemoAction() {
  await resetDemo();
  revalidatePath("/", "layout");
  redirect("/");
}
