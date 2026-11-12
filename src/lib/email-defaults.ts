import { serializeBlocks, type Block, type TemplateRules } from "./email-engine";

/*
 * Built-in email templates. Staff can override any of them on the
 * "Modèles de courriel" page (saved in the email_templates table); deleting
 * the override restores these. The body is written as blocks here and turned
 * into the editable text format with serializeBlocks().
 *
 * One email now covers every subject of a child: {{cours}} expands into one
 * box per course (time slot, teacher, Zoom details), and a single button
 * confirms all of them.
 */

export type TemplateKey = "bienvenue_tutorat" | "bienvenue_classes_futees" | "relance" | "merci" | "alerte_va";

export const TEMPLATE_KEYS: TemplateKey[] = ["bienvenue_tutorat", "bienvenue_classes_futees", "relance", "merci", "alerte_va"];

export const isTemplateKey = (k: string): k is TemplateKey => (TEMPLATE_KEYS as string[]).includes(k);

export interface TemplateMeta {
  key: TemplateKey;
  title: string;
  when: string;
  rules: TemplateRules;
  preheader: string;
  subject: string;
  blocks: Block[];
}

const CONFIRM_BUTTON: Block = { t: "button", label: "Je confirme la réception", href: "" };

const welcomeTutorat: Block[] = [
  { t: "p", text: "Bonjour chers parents," },
  { t: "p", text: "Nous sommes très heureux d'accueillir {{prenom}} dans son parcours de tutorat. 💛" },
  { t: "p", text: "Nous savons que chaque enfant a ses propres besoins et son propre rythme d'apprentissage. Notre équipe est là pour l'accompagner, l'encourager et l'aider à progresser, tout en développant peu à peu sa confiance en ses capacités." },
  { t: "p", text: "Vous avez choisi de nous faire confiance pour accompagner votre enfant et nous sommes heureux de pouvoir avancer avec vous dans cette démarche. Chaque progrès compte! ✨" },

  { t: "h", text: "🚨 Important : à lire au complet et à conserver" },
  { t: "p", text: "👉 **Il est très important de lire ce courriel jusqu'à la fin.**" },
  { t: "p", text: "📩 **Ce courriel regroupe les informations de tous les cours suivis par {{prenom}}** ({{matieres}}). Nous vous demandons de **le conserver précieusement**, puisque les liens qui s'y trouvent vous permettent d'accéder directement aux cours de votre enfant." },
  { t: "p", text: "Chaque cours a son propre horaire, sa propre enseignante et son propre lien Zoom : tout est indiqué dans la section « Les informations de vos cours » ci-dessous." },
  { t: "p", text: "✅ **Merci de nous confirmer la réception de ce courriel** en cliquant sur le bouton ci-dessous. Un seul clic confirme tous les cours de {{prenom}}. Cette confirmation nous permet de savoir que vous avez bien reçu les informations nécessaires pour accéder à ses cours." },
  { ...CONFIRM_BUTTON, note: "Vous pouvez aussi simplement répondre CONFIRMER à ce courriel." },

  { t: "h", text: "📚 Les informations de vos cours" },
  { t: "cours" },
  { t: "p", text: "Nous vous recommandons de vous connecter 5 minutes avant le début de chaque cours afin de vous assurer que tout fonctionne correctement." },

  { t: "h", text: "💻 Votre plateforme éducative : le point de départ" },
  { t: "p", text: "Tout commence sur notre plateforme éducative Éducation Futée." },
  { t: "p", text: "⚠️ **Votre accès n'est pas créé automatiquement à la suite de votre inscription.** Chaque accès est préparé par un membre de notre équipe afin de nous assurer que tout est bien configuré pour votre enfant." },
  { t: "p", text: "**Vous recevrez une invitation par courriel dans un délai de 24 à 48 heures.** 📩 Surveillez bien votre boîte courriel ainsi que vos courriels indésirables, puisque cette invitation contiendra toutes les informations nécessaires pour accéder à votre compte." },
  { t: "p", text: "Une fois votre accès reçu, connectez-vous à la plateforme et commencez par consulter la section « Fonctionnement »." },

  { t: "h", text: "🏡 Le Village" },
  { t: "p", text: "Même si vos liens Zoom vous permettent d'accéder directement aux cours, **le Village demeure un espace important de votre expérience avec Éducation Futée.** 💛 C'est dans le Village que nous partageons notamment :" },
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
  { t: "p", text: "✅ **1. Confirmez la réception de ce courriel.** Cette confirmation nous permet simplement de savoir que vous avez bien reçu toutes les informations nécessaires pour que votre enfant puisse accéder à ses cours." },
  CONFIRM_BUTTON,
  { t: "p", text: "✅ **2. Envoyez un petit message à Karine (EDFU) directement sur la plateforme.** Une fois connecté, repérez la bulle de discussion privée dans le coin supérieur droit de votre écran. Cliquez sur la bulle et écrivez un petit message à Karine pour lui confirmer que tout fonctionne correctement. Vous pouvez aussi utiliser cette messagerie privée pour lui poser vos questions." },
  { t: "p", text: "✅ **3. Téléchargez l'application gratuite Zoom** sur votre ordinateur pour une meilleure expérience." },
  { t: "space" },
  { t: "p", text: "✨ Nous avons très hâte de vous retrouver en classe et d'accompagner votre enfant dans cette belle aventure!" },
  { t: "p", text: "**L'équipe d'Éducation Futée**" },
];

const welcomeClassesFutees: Block[] = [
  { t: "p", text: "Bonjour chers parents," },
  { t: "p", text: "Nous sommes très heureux de vous accueillir, vous et votre enfant, au sein d'Éducation Futée! 💛" },
  { t: "p", text: "En choisissant les Classes Futées, vous avez fait plus qu'inscrire votre enfant à un programme : vous avez choisi de vous impliquer dans ses apprentissages et de vous outiller pour mieux l'accompagner. Et pour cela, nous tenons à vous féliciter!" },
  { t: "p", text: "Avec ce programme unique au Québec, nous vous ouvrons la porte de la classe. Vous pourrez enfin voir comment votre enfant apprend, découvrir les stratégies qui lui sont enseignées et l'aider à les réutiliser à la maison et à l'école." },
  { t: "p", text: "Vous devenez un véritable partenaire de ses apprentissages, et nous sommes privilégiés de faire équipe avec vous. ✨ Merci d'embarquer dans cette belle aventure avec nous. C'est ici que tout commence!" },

  { t: "h", text: "📚 Les plages horaires de {{prenom}}" },
  { t: "cours" },
  { t: "p", text: "✅ **Merci de nous confirmer que vous avez bien reçu et lu ce courriel :**" },
  { ...CONFIRM_BUTTON, note: "Ce courriel regroupe toutes les matières de {{prenom}} ({{matieres}}). Un seul clic les confirme toutes." },

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

  { t: "h", text: "📚 2. Vos plages horaires sont déjà réservées" },
  { t: "p", text: "Lors de votre inscription, vous avez choisi avec notre conseillère au succès scolaire les plages horaires qui conviennent à votre enfant. Elles sont indiquées plus haut dans ce courriel." },
  { t: "p", text: "Vous pourrez retrouver le lien de chaque rencontre sur la plateforme éducative, dans la section « Classes Futées », à la page de la matière concernée, puis dans l'onglet « Horaire et lien » sous la vidéo explicative." },
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
  { t: "list", items: ["✅ connectez-vous à la plateforme;", "✅ visionnez la section « Fonctionnement »;", "✅ repérez la section « Classes Futées » de votre enfant;", "✅ vérifiez vos plages horaires dans l'onglet « Horaire et lien »;", "✅ assurez-vous de savoir où se trouve le lien pour rejoindre chaque cours;", "✅ téléchargez l'application Zoom sur votre ordinateur."] },

  { t: "h", text: "🚨 Vous avez tout lu? Voici quoi faire maintenant" },
  { t: "p", text: "**1️⃣ Confirmez la réception de ce courriel.**" },
  CONFIRM_BUTTON,
  { t: "p", text: "**2️⃣ Surveillez vos courriels.** Votre invitation à la plateforme arrivera dans un délai de 24 à 48 heures (vérifiez aussi vos courriels indésirables)." },
  { t: "p", text: "**3️⃣ Dès que vous recevez votre accès, connectez-vous.** Visionnez la section « Fonctionnement », puis rendez-vous dans « Classes Futées » et vérifiez vos plages dans l'onglet « Horaire et lien »." },
  { t: "p", text: "**4️⃣ Envoyez un petit message à Karine (EDFU) sur la plateforme.** Repérez la bulle de discussion privée dans le coin supérieur droit de votre écran et écrivez-lui pour confirmer que tout fonctionne. Vous pouvez aussi l'utiliser pour poser vos questions." },

  { t: "h", text: "💛 Nous sommes là pour vous accompagner" },
  { t: "p", text: "Nous savons que chaque famille a sa propre réalité. Notre souhait est de vous offrir de la souplesse, de l'accompagnement et une communauté dans laquelle votre enfant peut évoluer à son rythme." },
  { t: "p", text: "Pour toute question : Karine (EDFU), par la messagerie privée de la plateforme. Pour un changement de plage horaire : info@educationfutee.com." },
  { t: "space" },
  { t: "p", text: "✨ Nous avons très hâte de vous retrouver en classe! Bienvenue dans les Classes Futées! 💛" },
  { t: "p", text: "**L'équipe d'Éducation Futée**" },
];

/** Follow-up wording below is a draft, pending the client's own texts. */
const relance: Block[] = [
  { t: "p", text: "Bonjour chers parents," },
  { t: "p", text: "Nous n'avons pas encore reçu votre confirmation pour {{cours_phrase}} de {{prenom}}. Pour que tout soit prêt dès le premier cours, merci de confirmer que vous avez bien reçu les informations :" },
  { t: "cours" },
  { ...CONFIRM_BUTTON, note: "Un seul clic confirme tous les cours de {{prenom}}." },
  { t: "p", text: "Vous ne retrouvez pas le courriel de bienvenue? Vérifiez vos courriels indésirables, ou écrivez-nous à info@educationfutee.com." },
  { t: "p", text: "**L'équipe d'Éducation Futée**" },
];

const merci: Block[] = [
  { t: "p", text: "Bonjour chers parents," },
  { t: "p", text: "Merci! Nous avons bien reçu votre confirmation pour **{{cours_phrase}}** de {{prenom}} (groupes {{groupes}}). 💛" },
  { t: "p", text: "Prochaine étape : surveillez vos courriels pour l'invitation à la plateforme éducative (vérifiez aussi vos courriels indésirables)." },
  { t: "p", text: "Au plaisir de retrouver votre enfant en classe!" },
  { t: "p", text: "**L'équipe d'Éducation Futée**" },
];

const alerteVa: Block[] = [
  { t: "p", text: "Bonjour Karine," },
  { t: "p", text: "Le parent de **{{prenom}}** n'a toujours pas confirmé après le courriel de bienvenue et le rappel. Merci de l'appeler." },
  { t: "coords" },
  { t: "button", label: "Ouvrir la fiche de l'élève", href: "" },
];

export const TEMPLATES: Record<TemplateKey, TemplateMeta> = {
  bienvenue_tutorat: {
    key: "bienvenue_tutorat",
    title: "Bienvenue : Tutorat",
    when: "Envoyé à l'inscription, un seul courriel pour toutes les matières de l'enfant en Tutorat.",
    rules: { needsButton: true, needsCours: true, needsCoords: false },
    preheader: "Les informations des cours de {{prenom}} ({{matieres}}) et les étapes avant le premier cours.",
    subject: "🎉 Bienvenue au tutorat Éducation Futée!",
    blocks: welcomeTutorat,
  },
  bienvenue_classes_futees: {
    key: "bienvenue_classes_futees",
    title: "Bienvenue : Classes Futées",
    when: "Envoyé à l'inscription, un seul courriel pour toutes les matières de l'enfant en Classes Futées.",
    rules: { needsButton: true, needsCours: true, needsCoords: false },
    preheader: "Les plages horaires de {{prenom}} ({{matieres}}) et les étapes avant le premier cours.",
    subject: "🎉 Bienvenue dans les Classes Futées!",
    blocks: welcomeClassesFutees,
  },
  relance: {
    key: "relance",
    title: "Rappel de confirmation",
    when: "Envoyé 24 h après le courriel de bienvenue si le parent n'a pas confirmé. Un seul rappel par enfant.",
    rules: { needsButton: true, needsCours: true, needsCoords: false },
    preheader: "Un clic suffit pour confirmer.",
    subject: "Rappel : confirmez les informations de {{prenom}}",
    blocks: relance,
  },
  merci: {
    key: "merci",
    title: "Merci (confirmation reçue)",
    when: "Envoyé quand le parent confirme la réception.",
    rules: { needsButton: false, needsCours: false, needsCoords: false },
    preheader: "Confirmation reçue : {{matieres}}, groupes {{groupes}}.",
    subject: "Merci! Confirmation reçue pour {{prenom}}",
    blocks: merci,
  },
  alerte_va: {
    key: "alerte_va",
    title: "Alerte à l'adjointe (à appeler)",
    when: "Envoyé à Karine quand une famille n'a pas confirmé 24 h après le rappel.",
    rules: { needsButton: false, needsCours: false, needsCoords: true },
    preheader: "Aucune confirmation après le rappel.",
    subject: "À appeler : {{prenom}} ({{groupes}})",
    blocks: alerteVa,
  },
};

export const defaultBody = (key: TemplateKey): string => serializeBlocks(TEMPLATES[key].blocks);
