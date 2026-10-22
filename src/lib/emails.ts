import type { Group, Student } from "./types";
import { appUrl } from "./db";
import { cycleLabel, subjectLabel } from "./labels";

/*
 * Email templates.
 *
 * Each email is described as a list of blocks, rendered twice: as simple,
 * table-based HTML (what most inboxes handle best) and as a plain-text part.
 * Sending both parts, keeping one column, real text instead of images, and
 * using bold only for headings and key lines is what helps deliverability
 * and readability.
 *
 * Inline syntax inside strings: **bold**. URLs and email addresses become links.
 */

type Block =
  | { t: "h"; text: string }
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  | { t: "box"; title: string; rows: [string, string][]; extra?: string[] }
  | { t: "button"; label: string; href: string; note?: string }
  | { t: "space" };

export interface RenderedEmail {
  subject: string;
  preheader: string;
  html: string;
  text: string;
}

const BRAND = "#c4600b";
const INK = "#1c1917";
const MUTED = "#57534e";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inline(s: string): string {
  let out = esc(s);
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(https?:\/\/[^\s<]+)/g, (u) => `<a href="${u}" style="color:${BRAND};word-break:break-all;">${u}</a>`);
  out = out.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+)/g, (_m, pre, mail) => `${pre}<a href="mailto:${mail}" style="color:${BRAND};">${mail}</a>`);
  return out;
}

function plain(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1");
}

function renderHtml(blocks: Block[], preheader: string): string {
  const body = blocks
    .map((b) => {
      switch (b.t) {
        case "h":
          return `<h2 style="margin:28px 0 10px;font-size:18px;line-height:1.35;color:${INK};font-weight:700;">${inline(b.text)}</h2>`;
        case "p":
          return `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:${INK};">${inline(b.text)}</p>`;
        case "list":
          return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">${b.items
            .map((i) => `<tr><td style="padding:3px 0;font-size:16px;line-height:1.55;color:${INK};">${inline(i)}</td></tr>`)
            .join("")}</table>`;
        case "box":
          return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;background:#fff7ee;border:1px solid #f6dcc0;border-radius:8px;">
<tr><td style="padding:16px 18px;">
<p style="margin:0 0 10px;font-size:15px;font-weight:700;color:${INK};">${inline(b.title)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0">${b.rows
            .map(([k, v]) => `<tr><td style="padding:3px 16px 3px 0;font-size:15px;color:${MUTED};white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:3px 0;font-size:15px;color:${INK};font-weight:600;">${inline(v)}</td></tr>`)
            .join("")}</table>${(b.extra ?? []).map((e) => `<p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:${INK};">${inline(e)}</p>`).join("")}
</td></tr></table>`;
        case "button":
          return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 ${b.note ? 6 : 18}px;">
<tr><td style="border-radius:6px;background:${BRAND};"><a href="${esc(b.href)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;">${esc(b.label)}</a></td></tr></table>${
            b.note ? `<p style="margin:0 0 18px;font-size:13px;line-height:1.5;color:${MUTED};">${inline(b.note)}</p>` : ""
          }`;
        case "space":
          return `<div style="height:8px;line-height:8px;">&nbsp;</div>`;
      }
    })
    .join("\n");

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Éducation Futée</title></head>
<body style="margin:0;padding:0;background:#f5f5f4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f4;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:10px;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:20px 28px 14px;border-bottom:3px solid #f5c400;"><img src="${appUrl()}/logo-email.png" width="120" alt="Éducation Futée" style="display:block;width:120px;height:auto;border:0;font-size:18px;font-weight:700;color:${BRAND};"></td></tr>
<tr><td style="padding:8px 28px 26px;">
${body}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.5;color:${MUTED};">Éducation Futée · info@educationfutee.com<br>Vous recevez ce courriel à la suite de l'inscription de votre enfant.</td></tr>
</table></td></tr></table></body></html>`;
}

function renderText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "h":
          return `\n${plain(b.text).toUpperCase()}\n`;
        case "p":
          return plain(b.text) + "\n";
        case "list":
          return b.items.map((i) => `  ${plain(i)}`).join("\n") + "\n";
        case "box":
          return `${plain(b.title)}\n${b.rows.map(([k, v]) => `  ${k} ${plain(v)}`).join("\n")}${(b.extra ?? []).map((e) => `\n  ${plain(e)}`).join("")}\n`;
        case "button":
          return `${b.label} : ${b.href}\n${b.note ? plain(b.note) + "\n" : ""}`;
        case "space":
          return "";
      }
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function build(subject: string, preheader: string, blocks: Block[]): RenderedEmail {
  return { subject, preheader, html: renderHtml(blocks, preheader), text: renderText(blocks) };
}

/* ------------------------------------------------------------------ */
/* Bienvenue : Tutorat (one email per subject)                         */
/* ------------------------------------------------------------------ */

export function tutoratWelcome(g: Group, s: Student, confirmUrl: string): RenderedEmail {
  const zoomRows: string[] = [];
  if (g.zoom_url) zoomRows.push(g.zoom_url);
  if (g.zoom_id) zoomRows.push(`ID : ${g.zoom_id}`);
  if (g.zoom_password) zoomRows.push(`Mot de passe : ${g.zoom_password}`);

  return build(
    "🎉 Bienvenue au tutorat Éducation Futée!",
    `Les informations du cours de ${subjectLabel[g.subject].toLowerCase()} de ${s.first_name} (groupe ${g.code}).`,
    [
      { t: "p", text: "Bonjour chers parents," },
      { t: "p", text: `Nous sommes très heureux d'accueillir ${s.first_name} dans son parcours de tutorat. 💛` },
      { t: "p", text: "Nous savons que chaque enfant a ses propres besoins et son propre rythme d'apprentissage. Notre équipe est là pour l'accompagner, l'encourager et l'aider à progresser, tout en développant peu à peu sa confiance en ses capacités." },
      { t: "p", text: "Vous avez choisi de nous faire confiance pour accompagner votre enfant et nous sommes heureux de pouvoir avancer avec vous dans cette démarche. Chaque progrès compte! ✨" },

      { t: "h", text: "🚨 Important : à lire au complet et à conserver" },
      { t: "p", text: "👉 **Il est très important de lire ce courriel jusqu'à la fin.**" },
      { t: "p", text: "📩 **Vous recevrez un courriel pour chaque matière suivie par votre enfant.** Nous vous demandons de **conserver précieusement chacun de ces courriels**, puisque le lien qui s'y trouve vous permettra d'accéder directement au cours de votre enfant." },
      { t: "p", text: "Même si vous avez déjà reçu un lien pour une autre matière, chaque courriel contient les informations et le lien propres au cours concerné." },
      { t: "p", text: "✅ **Merci de nous confirmer la réception de ce courriel** en cliquant sur le bouton ci-dessous. Cette confirmation nous permet de savoir que vous avez bien reçu les informations nécessaires pour accéder au cours de votre enfant." },
      { t: "button", label: "Je confirme la réception", href: confirmUrl, note: "Vous pouvez aussi simplement répondre CONFIRMER à ce courriel." },

      {
        t: "box",
        title: "📚 Les informations de votre cours",
        rows: [
          ["Élève :", s.first_name],
          ["Groupe :", g.code],
          ["Matière :", subjectLabel[g.subject]],
          ["Cycle :", cycleLabel(g.cycle)],
          ["Enseignante :", g.teacher ?? "À confirmer"],
          ["Journée :", g.day ?? "À confirmer"],
          ["Heure :", g.time ?? "À confirmer"],
        ],
      },

      { t: "h", text: "🔗 Votre lien pour le cours" },
      { t: "p", text: "Vous pouvez accéder directement au cours de tutorat de votre enfant à l'aide du lien suivant :" },
      ...(zoomRows.length
        ? [{ t: "list" as const, items: zoomRows }]
        : [{ t: "p" as const, text: "**Le lien Zoom vous sera communiqué sous peu.**" }]),
      { t: "p", text: "Nous vous recommandons de vous connecter 5 minutes avant le début du cours afin de vous assurer que tout fonctionne correctement." },

      { t: "h", text: "💻 Votre plateforme éducative : le point de départ" },
      { t: "p", text: "Tout commence sur notre plateforme éducative Éducation Futée." },
      { t: "p", text: "⚠️ **Votre accès n'est pas créé automatiquement à la suite de votre inscription.** Chaque accès est préparé par un membre de notre équipe afin de nous assurer que tout est bien configuré pour votre enfant." },
      { t: "p", text: "**Vous recevrez une invitation par courriel dans un délai de 24 à 48 heures.** 📩 Surveillez bien votre boîte courriel ainsi que vos courriels indésirables, puisque cette invitation contiendra toutes les informations nécessaires pour accéder à votre compte." },
      { t: "p", text: "Une fois votre accès reçu, connectez-vous à la plateforme et commencez par consulter la section « Fonctionnement »." },

      { t: "h", text: "🏡 Le Village" },
      { t: "p", text: "Même si votre lien Zoom vous permet d'accéder directement au cours, **le Village demeure un espace important de votre expérience avec Éducation Futée.** 💛 C'est dans le Village que nous partageons notamment :" },
      {
        t: "list",
        items: [
          "📢 les informations et communications importantes;",
          "📚 du matériel supplémentaire pour accompagner les apprentissages;",
          "🎉 les nouveautés et activités de la communauté;",
          "💬 les rendez-vous comme les **Samedis Causerie**;",
          "🎓 des formations en ligne gratuites, comme **Mission Fluidité**;",
          "✨ ainsi que différentes ressources qui peuvent vous être utiles tout au long de l'année.",
        ],
      },
      { t: "p", text: "Nous vous invitons à **visiter le Village chaque semaine** afin de rester au courant des informations et des ressources disponibles pour votre famille." },

      { t: "h", text: "🎥 Un imprévu? Pensez aux rediffusions!" },
      { t: "p", text: "Si votre enfant doit exceptionnellement manquer un cours de tutorat, vous pouvez demander à son enseignante **le contenu qui a été manqué**." },
      { t: "p", text: "Bien que les cours de tutorat ne soient pas enregistrés, vous avez accès aux **rediffusions des Classes Futées** sur notre plateforme éducative, dans la section « Classes Futées » de la matière concernée." },
      { t: "p", text: "Le contenu enseigné est le même, mais les cours ne sont pas nécessairement synchronisés puisque le tutorat avance au rythme de chaque groupe. Vous pourrez donc repérer la notion manquée parmi les rediffusions et la revoir avec votre enfant au moment qui vous convient. 💛" },

      { t: "h", text: "💛 Nous sommes là pour vous accompagner" },
      { t: "p", text: "Notre souhait est que votre enfant se sente encouragé, soutenu et valorisé dans ses apprentissages." },
      { t: "p", text: "Si vous avez des questions ou besoin d'aide, vous pouvez communiquer avec Karine, notre adjointe virtuelle, à info@educationfutee.com." },

      { t: "h", text: "🚨 Rappel : actions à faire" },
      { t: "p", text: "✅ **1. Confirmez la réception de ce courriel.** Cette confirmation nous permet simplement de savoir que vous avez bien reçu toutes les informations nécessaires pour que votre enfant puisse accéder à son cours." },
      { t: "button", label: "Je confirme la réception", href: confirmUrl },
      { t: "p", text: "✅ **2. Envoyez un petit message à Karine (EDFU) directement sur la plateforme.** Une fois connecté, repérez la bulle de discussion privée dans le coin supérieur droit de votre écran. Cliquez sur la bulle et écrivez un petit message à Karine pour lui confirmer que tout fonctionne correctement. Vous pouvez aussi utiliser cette messagerie privée pour lui poser vos questions." },
      { t: "p", text: "✅ **3. Téléchargez l'application gratuite Zoom** sur votre ordinateur pour une meilleure expérience." },
      { t: "space" },
      { t: "p", text: "✨ Nous avons très hâte de vous retrouver en classe et d'accompagner votre enfant dans cette belle aventure!" },
      { t: "p", text: "**L'équipe d'Éducation Futée**" },
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Bienvenue : Classes Futées (one email per subject)                  */
/* ------------------------------------------------------------------ */

export function classesFuteesWelcome(g: Group, s: Student, confirmUrl: string): RenderedEmail {
  const matiere = subjectLabel[g.subject];
  const plage = [g.day ? `le ${g.day.toLowerCase()}` : null, g.time ? `à ${g.time}` : null, g.teacher ? `avec Mme ${g.teacher}` : null]
    .filter(Boolean)
    .join(" ");

  return build(
    "🎉 Bienvenue dans les Classes Futées!",
    `La plage horaire de ${s.first_name} en ${matiere.toLowerCase()} et les étapes avant le premier cours.`,
    [
      { t: "p", text: "Bonjour chers parents," },
      { t: "p", text: "Nous sommes très heureux de vous accueillir, vous et votre enfant, au sein d'Éducation Futée! 💛" },
      { t: "p", text: "En choisissant les Classes Futées, vous avez fait plus qu'inscrire votre enfant à un programme : vous avez choisi de vous impliquer dans ses apprentissages et de vous outiller pour mieux l'accompagner. Et pour cela, nous tenons à vous féliciter!" },
      { t: "p", text: "Avec ce programme unique au Québec, nous vous ouvrons la porte de la classe. Vous pourrez enfin voir comment votre enfant apprend, découvrir les stratégies qui lui sont enseignées et l'aider à les réutiliser à la maison et à l'école." },
      { t: "p", text: "Vous devenez un véritable partenaire de ses apprentissages, et nous sommes privilégiés de faire équipe avec vous. ✨ Merci d'embarquer dans cette belle aventure avec nous. C'est ici que tout commence!" },

      {
        t: "box",
        title: `📚 Votre plage horaire en ${matiere} (${cycleLabel(g.cycle)})`,
        rows: [
          ["Élève :", s.first_name],
          ["Groupe :", g.code],
          ["Plage :", plage || "À confirmer"],
        ],
        extra: ["👉 Cette plage devient votre plage horaire attitrée et doit être respectée chaque semaine."],
      },
      { t: "p", text: "✅ **Merci de nous confirmer que vous avez bien reçu et lu ce courriel :**" },
      { t: "button", label: "Je confirme la réception", href: confirmUrl, note: "Vous recevrez un courriel pour chaque matière à laquelle votre enfant est inscrit. Merci de confirmer chacun d'eux." },

      { t: "h", text: "🚨 Important : commencez ici" },
      { t: "p", text: "Avant toute chose, merci de prendre quelques minutes pour **lire ce courriel jusqu'à la fin** et de conserver les informations." },
      { t: "p", text: "Pour participer aux Classes Futées, vous aurez accès à notre plateforme éducative Éducation Futée. C'est à cet endroit que vous retrouverez les cours de votre enfant, les horaires, les liens pour assister aux cours en direct ainsi que les rediffusions." },
      { t: "p", text: "👉 Avant de vous y rendre, poursuivez votre lecture jusqu'à la fin. Nous vous expliquons ici, étape par étape, comment tout fonctionne et quoi faire pour être prêts dès le premier cours. 💛" },

      { t: "h", text: "💻 1. Votre plateforme éducative : le point de départ" },
      { t: "p", text: "⚠️ **Votre accès n'est pas créé automatiquement à la suite de votre inscription.** Chaque accès est préparé par un membre de notre équipe afin de nous assurer que tout est bien configuré pour votre enfant." },
      { t: "p", text: "**Vous recevrez une invitation par courriel dans un délai de 24 à 48 heures.** 📩 Surveillez bien votre boîte courriel ainsi que vos courriels indésirables." },
      { t: "p", text: "Une fois votre accès reçu, connectez-vous à la plateforme et commencez par consulter la section « Fonctionnement ». Nous vous invitons à visionner les courtes vidéos qui s'y trouvent **avant votre premier cours**. Elles vous permettront notamment de comprendre :" },
      { t: "list", items: ["🔎 comment trouver le cycle et la matière de votre enfant;", "🔗 comment accéder au lien du cours en direct;", "🎥 comment retrouver une rediffusion;", "📢 où retrouver les informations importantes."] },
      { t: "p", text: "Vous pourrez ensuite vous rendre dans la section « Classes Futées », où vous retrouverez les matières auxquelles votre enfant est inscrit : les liens pour assister aux cours en direct, les horaires des cours et les rediffusions." },
      { t: "p", text: "👨‍👩‍👧 **Les deux parents souhaitent avoir accès à la plateforme?** Vous n'avez pas besoin de créer deux comptes. Utilisez simplement le même compte et le même mot de passe pour vous connecter." },

      { t: "h", text: "📚 2. Votre plage horaire est déjà réservée" },
      { t: "p", text: `Lors de votre inscription, vous avez choisi avec notre conseillère au succès scolaire la plage horaire qui convient à votre enfant. Votre plage horaire en **${matiere.toUpperCase()} ${cycleLabel(g.cycle).toUpperCase()}** est : **${plage || "à confirmer"}**.` },
      { t: "p", text: `Vous pourrez retrouver le lien de cette rencontre sur la plateforme éducative dans la section « Classes Futées », en **${matiere}**, puis dans l'onglet « Horaire et lien » sous la vidéo explicative.` },
      { t: "p", text: "Cette organisation nous permet de maintenir des groupes équilibrés et d'offrir à chaque enfant les meilleures conditions d'apprentissage possibles." },

      { t: "h", text: "✨ 3. Un imprévu? Une autre plage peut être accessible" },
      { t: "p", text: "Si votre enfant ne peut exceptionnellement pas assister à sa plage horaire habituelle, vous pouvez vérifier les autres cours offerts dans la même matière et au cours de la même semaine." },
      { t: "list", items: ["👉 Si une autre plage porte la mention « Places disponibles », votre enfant peut exceptionnellement assister à ce cours sans préavis.", "⚠️ Si la plage indique « Complet », il n'est pas possible de se joindre à ce groupe."] },
      { t: "p", text: "Cette possibilité est prévue pour les imprévus occasionnels. Votre plage horaire attitrée demeure celle choisie lors de votre inscription." },

      { t: "h", text: "🎥 4. Un cours manqué? Pensez aux rediffusions!" },
      { t: "p", text: "Si votre enfant ne peut assister à aucun cours en direct cette semaine-là, vous avez accès aux rediffusions des Classes Futées sur la plateforme, dans la section « Classes Futées » de la matière concernée, sous REDIFFUSIONS." },

      { t: "h", text: "📅 5. De nouvelles plages horaires peuvent s'ajouter" },
      { t: "p", text: "Au cours de l'année, de nouvelles plages horaires et de nouveaux groupes peuvent être ajoutés selon les besoins et le nombre d'élèves. Surveillez l'onglet « Horaire et lien » de chacune des matières de votre enfant." },
      { t: "p", text: "💡 **Une nouvelle plage vous conviendrait mieux?** Si une plage porte la mention « Places disponibles », écrivez-nous à info@educationfutee.com pour demander le changement, pendant qu'elle est encore disponible. Ne changez pas de groupe par vous-même chaque semaine : notre équipe doit confirmer le changement." },

      { t: "h", text: "🏡 6. Découvrez le Village" },
      { t: "p", text: "En plus de votre plateforme éducative, vous aurez accès au Village Éducation Futée, le cœur de notre communauté. 💛 Vous y retrouverez notamment :" },
      { t: "list", items: ["📢 les informations et communications importantes;", "📖 du matériel supplémentaire pour accompagner les apprentissages;", "🎉 les activités et nouveautés proposées par Éducation Futée;", "🏆 des activités spéciales, comme les concours;", "💬 les Samedis Causerie et autres rendez-vous de la communauté;", "🎓 des formations en ligne gratuites, comme Mission Fluidité."] },
      { t: "p", text: "👉 Nous vous invitons à visiter le Village chaque semaine." },

      { t: "h", text: "⚠️ Un petit rappel pour vous éviter du stress" },
      { t: "p", text: "Il n'y a pas toujours une personne disponible pour répondre à un message envoyé quelques minutes avant le début du cours. N'attendez donc pas le jour du premier cours pour tester vos accès. Dès que vous recevez votre invitation :" },
      { t: "list", items: ["✅ connectez-vous à la plateforme;", "✅ visionnez la section « Fonctionnement »;", "✅ repérez la section « Classes Futées » de votre enfant;", "✅ vérifiez votre plage horaire dans l'onglet « Horaire et lien »;", "✅ assurez-vous de savoir où se trouve le lien pour rejoindre le cours;", "✅ téléchargez l'application Zoom sur votre ordinateur."] },

      { t: "h", text: "🚨 Vous avez tout lu? Voici quoi faire maintenant" },
      { t: "p", text: "**1️⃣ Confirmez la réception de ce courriel.**" },
      { t: "button", label: "Je confirme la réception", href: confirmUrl },
      { t: "p", text: "**2️⃣ Surveillez vos courriels.** Votre invitation à la plateforme arrivera dans un délai de 24 à 48 heures (vérifiez aussi vos courriels indésirables)." },
      { t: "p", text: "**3️⃣ Dès que vous recevez votre accès, connectez-vous.** Visionnez la section « Fonctionnement », puis rendez-vous dans « Classes Futées » et vérifiez votre plage dans l'onglet « Horaire et lien »." },
      { t: "p", text: "**4️⃣ Envoyez un petit message à Karine (EDFU) sur la plateforme.** Repérez la bulle de discussion privée dans le coin supérieur droit de votre écran et écrivez-lui pour confirmer que tout fonctionne. Vous pouvez aussi l'utiliser pour poser vos questions." },

      { t: "h", text: "💛 Nous sommes là pour vous accompagner" },
      { t: "p", text: "Nous savons que chaque famille a sa propre réalité. Notre souhait est de vous offrir de la souplesse, de l'accompagnement et une communauté dans laquelle votre enfant peut évoluer à son rythme." },
      { t: "p", text: "Pour toute question : Karine (EDFU), par la messagerie privée de la plateforme. Pour un changement de plage horaire : info@educationfutee.com." },
      { t: "space" },
      { t: "p", text: "✨ Nous avons très hâte de vous retrouver en classe! Bienvenue dans les Classes Futées! 💛" },
      { t: "p", text: "**L'équipe d'Éducation Futée**" },
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Follow-ups (draft wording, to be replaced by the client's own)      */
/* ------------------------------------------------------------------ */

export interface PendingItem {
  group: Group;
  confirmUrl: string;
}

export function reminderEmail(s: Student, items: PendingItem[]): RenderedEmail {
  const blocks: Block[] = [
    { t: "p", text: "Bonjour chers parents," },
    { t: "p", text: `Nous n'avons pas encore reçu votre confirmation pour ${items.length > 1 ? "les cours" : "le cours"} de ${s.first_name}. Pour que tout soit prêt dès le premier cours, merci de confirmer que vous avez bien reçu les informations :` },
  ];
  for (const it of items) {
    blocks.push({
      t: "box",
      title: `${subjectLabel[it.group.subject]} (${cycleLabel(it.group.cycle)})`,
      rows: [["Groupe :", it.group.code], ["Plage :", [it.group.day, it.group.time].filter(Boolean).join(", ") || "À confirmer"]],
    });
    blocks.push({ t: "button", label: `Je confirme : ${subjectLabel[it.group.subject]}`, href: it.confirmUrl });
  }
  blocks.push(
    { t: "p", text: "Vous ne retrouvez pas le courriel de bienvenue? Vérifiez vos courriels indésirables, ou écrivez-nous à info@educationfutee.com." },
    { t: "p", text: "**L'équipe d'Éducation Futée**" },
  );
  return build(`Rappel : confirmez les informations du cours de ${s.first_name}`, "Un clic suffit pour confirmer.", blocks);
}

export function reminderSms(s: Student, items: PendingItem[], shortLink: string): string {
  const matieres = items.map((i) => subjectLabel[i.group.subject].toLowerCase()).join(", ");
  return `Éducation Futée : Bonjour! Nous attendons votre confirmation pour le cours de ${matieres} de ${s.first_name}. Confirmez ici : ${shortLink} Merci! Répondez STOP pour ne plus recevoir de SMS.`;
}

export function thanksEmail(g: Group, s: Student): RenderedEmail {
  return build(
    `Merci! Confirmation reçue pour ${s.first_name}`,
    `Confirmation reçue : ${subjectLabel[g.subject]}, groupe ${g.code}.`,
    [
      { t: "p", text: "Bonjour chers parents," },
      { t: "p", text: `Merci! Nous avons bien reçu votre confirmation pour le cours de **${subjectLabel[g.subject].toLowerCase()}** de ${s.first_name} (groupe ${g.code}). 💛` },
      { t: "p", text: "Prochaine étape : surveillez vos courriels pour l'invitation à la plateforme éducative (vérifiez aussi vos courriels indésirables)." },
      { t: "p", text: "Au plaisir de retrouver votre enfant en classe!" },
      { t: "p", text: "**L'équipe d'Éducation Futée**" },
    ],
  );
}

export function vaAlertEmail(s: Student, parent: { name: string | null; email: string; phone: string | null }, codes: string[], studentUrl: string): RenderedEmail {
  return build(
    `À appeler : ${s.first_name} (${codes.join(", ")})`,
    "Aucune confirmation après le rappel.",
    [
      { t: "p", text: "Bonjour Karine," },
      { t: "p", text: `Le parent de **${s.first_name}** n'a toujours pas confirmé après le courriel de bienvenue et le rappel (courriel + SMS). Merci de l'appeler.` },
      { t: "box", title: "Coordonnées", rows: [["Parent :", parent.name ?? "Non indiqué"], ["Courriel :", parent.email], ["Téléphone :", parent.phone ?? "Non indiqué"], ["Groupes :", codes.join(", ")]] },
      { t: "button", label: "Ouvrir la fiche de l'élève", href: studentUrl },
    ],
  );
}
