import { db } from "@/lib/db";
import { advanceClock, confirmByToken, createStudent, processDue, resetDemo } from "@/lib/onboarding";

// TEMPORARY: end-to-end check of the onboarding flow on the deployed app.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return new Response("Non autorisé", { status: 401 });
  const out: Record<string, unknown> = {};
  try {
    await resetDemo();
    const leo = await createStudent({ parent_name: "Marie Test", parent_email: "Marie.Test@example.com", parent_phone: "514 555-0101", first_name: "Léo", grade: "5e année", cycle: 3, start_date: "2026-11-03", end_date: "2027-06-15", closer_name: "Sophie", group_codes: ["3-L-02", "3-E-03", "3-M-01"] });
    await createStudent({ parent_name: "", parent_email: "marie.test@example.com", parent_phone: "", first_name: "Emma", grade: "3e année", cycle: 2, start_date: "", end_date: "", closer_name: "Sophie", group_codes: ["2CF-M-01", "2CF-L-01"] });
    await createStudent({ parent_name: "Julien Roy", parent_email: "julien.roy@example.com", parent_phone: "438 555-0199", first_name: "Noah", grade: "6e année", cycle: 3, start_date: "", end_date: "", closer_name: "Sophie", group_codes: ["3CF-E-03"] });
    for (const bad of [
      { cycle: 2 as const, group_codes: ["3-M-01"] },
      { cycle: 3 as const, group_codes: ["3-M-01", "3-M-02"] },
      { cycle: 3 as const, group_codes: [] },
    ]) {
      try {
        await createStudent({ parent_name: "", parent_email: "x@y.com", parent_phone: "", first_name: "Z", grade: "", start_date: "", end_date: "", closer_name: "", ...bad });
        (out.validation ??= [] as string[]) as string[];
        (out.validation as string[]).push("NOT REJECTED");
      } catch (e) {
        ((out.validation ??= []) as string[]).push((e as Error).message);
      }
    }
    out.families = (await db().from("families").select("parent_email, students(first_name)")).data;
    const enr = (await db().from("enrollments").select("group_code, confirm_token").eq("student_id", leo)).data!;
    const lec = enr.find((e) => e.group_code === "3-L-02")!;
    out.confirm1 = await confirmByToken(lec.confirm_token, "bouton");
    out.confirm2 = await confirmByToken(lec.confirm_token, "bouton");
    out.dueNow = await processDue();
    out.plus24 = await advanceClock(24);
    out.plus48 = await advanceClock(24);
    out.plus72 = await advanceClock(24);
    out.statuses = (await db().from("enrollments").select("group_code, status, student:students(first_name)").order("group_code")).data;
    out.messages = (await db().from("messages").select("kind, channel, to_address, subject, body_text").order("sent_at")).data!.map(
      (m) => `${m.kind} | ${m.channel} | ${m.to_address} | ${m.subject ?? m.body_text}`,
    );
    out.events = (await db().from("events").select("detail").order("at")).data!.map((e) => e.detail);
  } catch (e) {
    out.error = (e as Error).message;
  }
  return Response.json(out);
}
