import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import type { Group } from "@/lib/types";
import { GroupForm } from "../group-form";

export default async function EditGroupPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const g = (await db().from("groups").select("*").eq("code", decodeURIComponent(code)).maybeSingle()).data as Group | null;
  if (!g) notFound();
  return (
    <div>
      <PageHeader title={`Groupe ${g.code}`} subtitle="Les changements s'appliquent aux prochains courriels envoyés." />
      <GroupForm group={g} />
    </div>
  );
}
