import { templateCsv } from "@/lib/import-fields";

export const dynamic = "force-dynamic";

/** Header-only CSV template (behind the staff login, like every page except the parent confirmation). */
export function GET() {
  return new Response(templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modele-import-eleves.csv"',
      "Cache-Control": "no-store",
    },
  });
}
