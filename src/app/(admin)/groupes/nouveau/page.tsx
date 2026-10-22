import { PageHeader } from "@/components/ui";
import { GroupForm } from "../group-form";

export default function NewGroupPage() {
  return (
    <div>
      <PageHeader title="Nouveau groupe" subtitle="Même cours + même enseignante + autre journée ou heure = nouveau numéro de groupe." />
      <GroupForm />
    </div>
  );
}
