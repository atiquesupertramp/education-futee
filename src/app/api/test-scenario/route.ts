import { db } from "@/lib/db";
import { confirmByToken, createStudent, demoNow, processDue } from "@/lib/onboarding";

// TEMPORARY: non-destructive end-to-end check of the onboarding flow on the
// deployed app. Uses its own @example.com families, never touches the demo
// clock or other data, and deletes everything it created at the end.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return new Response("Non autorisé", { status: 401 });
  const out: Record<string, unknown> = {};
  const emails = ["zz-test-marie@example.com", "zz-test-julien@example.com"];
  const ids: string[] = [];
  // Pretend the next step is due, for the test students only.
  const makeDue = async () => {
    const past = new Date((await demoNow()).getTime() - 60_000).toISOString();
    await db().from("enrollments").update({ next_action_at: past }).in("student_id", ids).not("next_action_at", "is", null);
  };
  try {
    ids.push(await createStudent({ parent_name: "Marie Test", parent_email: "ZZ-Test-Marie@example.com", parent_phone: "514 555-0101", first_name: "Léo", grade: "5e année", cycle: 3, start_date: "2026-11-03", end_date: "2027-06-15", closer_name: "Test", group_codes: ["3-L-02", "3-E-03", "3-M-01"] }));
    ids.push(await createStudent({ parent_name: "", parent_email: emails[0], parent_phone: "", first_name: "Emma", grade: "3e année", cycle: 2, start_date: "", end_date: "", closer_name: "Test", group_codes: ["2CF-M-01", "2CF-L-01"] }));
    ids.push(await createStudent({ parent_name: "Julien Test", parent_email: emails[1], parent_phone: "", first_name: "Noah", grade: "6e année", cycle: 3, start_date: "", end_date: "", closer_name: "Test", group_codes: ["3CF-E-03"] }));
    const v: string[] = [];
    for (const bad of [
      { cycle: 2 as const, group_codes: ["3-M-01"] },
      { cycle: 3 as const, group_codes: ["3-M-01", "3-M-02"] },
      { cycle: 3 as const, group_codes: [] as string[] },
    ]) {
      try {
        ids.push(await createStudent({ parent_name: "", parent_email: emails[1], parent_phone: "", first_name: "Z", grade: "", start_date: "", end_date: "", closer_name: "", ...bad }));
        v.push("NOT REJECTED");
      } catch (e) {
        v.push((e as Error).message);
      }
    }
    out.validation = v;
    out.families = (await db().from("families").select("parent_email, parent_name, students(first_name)").in("parent_email", emails)).data;

    const enr = (await db().from("enrollments").select("group_code, confirm_token").eq("student_id", ids[0])).data!;
    const lec = enr.find((e) => e.group_code === "3-L-02")!;
    out.confirm1 = await confirmByToken(lec.confirm_token, "bouton");
    out.confirm2 = await confirmByToken(lec.confirm_token, "bouton");
    out.badToken = await confirmByToken("00000000-0000-0000-0000-000000000000", "bouton");
    out.dueBefore = await processDue();
    await makeDue();
    out.round1 = await processDue();
    // Emma's parent confirms Math after the reminder.
    const emma = (await db().from("enrollments").select("group_code, confirm_token").eq("student_id", ids[1])).data!;
    await confirmByToken(emma.find((e) => e.group_code === "2CF-M-01")!.confirm_token, "reponse");
    await makeDue();
    out.round2 = await processDue();
    out.round3 = await processDue();

    out.statuses = (await db().from("enrollments").select("group_code, status, student:students(first_name)").in("student_id", ids).order("group_code")).data;
    const msgs = (await db().from("messages").select("kind, channel, to_address, subject, body_text, body_html").in("student_id", ids).order("sent_at")).data!;
    out.messages = msgs.map((m) => `${m.kind} | ${m.channel} | ${m.to_address} | ${m.subject ?? m.body_text}`);
    const w = msgs.find((m) => m.kind === "bienvenue" && m.subject?.includes("tutorat"));
    out.tutoratWelcomeChecks = w && {
      hasZoom: w.body_html.includes("zoom.us/j/87976044602"),
      hasConfirmLink: /\/confirmer\/[0-9a-f-]{36}/.test(w.body_html),
      hasLogo: w.body_html.includes("/logo-email.png"),
      textLen: w.body_text.length,
      htmlLen: w.body_html.length,
    };
    const cf = msgs.find((m) => m.kind === "bienvenue" && m.subject?.includes("Classes"));
    out.cfSentence = cf?.body_text.split("\n").find((l: string) => l.includes("Votre plage horaire en"));
    out.cfLinkSentence = cf?.body_text.split("\n").find((l: string) => l.includes("Horaire et lien » sous"));
    out.sms = msgs.find((m) => m.channel === "sms")?.body_text;
    out.events = (await db().from("events").select("detail").in("student_id", ids).order("at")).data!.map((e) => e.detail);
  } catch (e) {
    out.error = (e as Error).message;
  } finally {
    await db().from("families").delete().in("parent_email", emails);
    out.leftover = (await db().from("families").select("id").in("parent_email", emails)).data?.length;
  }
  return Response.json(out);
}
