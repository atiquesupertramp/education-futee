import "server-only";
import { db } from "./db";
import { TEMPLATES, defaultBody, type TemplateKey } from "./email-defaults";
import { validateTemplate } from "./email-engine";
import type { TemplateContent } from "./emails";

export interface StoredTemplate extends TemplateContent {
  customized: boolean;
  updated_at: string | null;
}

const fallback = (key: TemplateKey): StoredTemplate => ({
  subject: TEMPLATES[key].subject,
  body: defaultBody(key),
  customized: false,
  updated_at: null,
});

/**
 * The template used to send an email: the saved version when there is a valid
 * one, otherwise the built-in default. Never throws, so a database hiccup or a
 * bad row can never stop an enrollment email from going out.
 */
export async function getTemplate(key: TemplateKey): Promise<StoredTemplate> {
  try {
    const { data, error } = await db().from("email_templates").select("subject, body, updated_at").eq("key", key).maybeSingle();
    if (error || !data) return fallback(key);
    if (validateTemplate(data.subject, data.body, TEMPLATES[key].rules)) return fallback(key);
    return { subject: data.subject, body: data.body, customized: true, updated_at: data.updated_at };
  } catch {
    return fallback(key);
  }
}

/** Which templates have been customized (for the list page). */
export async function customizedKeys(): Promise<Map<TemplateKey, string>> {
  const { data } = await db().from("email_templates").select("key, updated_at");
  return new Map(((data ?? []) as { key: TemplateKey; updated_at: string }[]).map((r) => [r.key, r.updated_at]));
}
