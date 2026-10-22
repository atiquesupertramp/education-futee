import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { Group } from "@/lib/types";
import { NewStudentForm } from "./form";

export default async function NewStudentPage() {
  const groups = ((await db().from("groups").select("*").eq("active", true).order("code")).data ?? []) as Group[];
  return (
    <div>
      <PageHeader
        title="Nouvel élève"
        subtitle="À remplir par la conseillère au moment de l'inscription. Un courriel de bienvenue est généré pour chaque matière choisie."
      />
      <NewStudentForm groups={groups} />
    </div>
  );
}
