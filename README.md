# Éducation Futée · Intégration des élèves (démo)

Système d'intégration des nouveaux élèves d'Éducation Futée (Lecture, Écriture, Mathématiques; Tutorat et Classes Futées).

**Mode démo : aucun courriel ni SMS n'est réellement envoyé.** Chaque message est généré et enregistré tel qu'il serait envoyé, et peut être consulté dans la Boîte d'envoi.

## Ce que fait l'application

1. La conseillère inscrit un élève (parent, enfant, cycle, programme, un groupe par matière, dates).
2. Un courriel de bienvenue est généré **pour chaque matière**, à partir du gabarit du programme (Tutorat ou Classes Futées) et des informations du groupe (enseignante, plage, lien Zoom).
3. Chaque courriel contient un bouton « Je confirme la réception ».
4. Sans confirmation après 24 h : un rappel par courriel + un SMS (un seul par enfant).
5. Toujours rien 24 h plus tard : la famille passe dans « À appeler » et l'adjointe reçoit une alerte.
6. À la confirmation : courriel de remerciement, les relances s'arrêtent.

Le tableau de bord suit les confirmations, l'abonnement (actif, en pause, terminé, dates) et les groupes.

## Codes de groupe

`[cycle][CF?]-[matière]-[numéro]`, par exemple `3CF-E-01` = 3e cycle, Classes Futées, Écriture, groupe 1. Sans `CF` = Tutorat. Matières : `L` Lecture, `E` Écriture, `M` Mathématiques. Le programme, le cycle et la matière sont déduits du code.

## Technique

- Next.js (App Router), hébergé sur Vercel
- Supabase (Postgres) : tables `groups`, `families`, `students`, `enrollments`, `messages`, `events`, `settings`
- Gabarits de courriels : `src/lib/emails.ts` (HTML simple + version texte)
- Logique d'intégration et relances : `src/lib/onboarding.ts`
- Relances quotidiennes : `/api/relances` (tâche planifiée Vercel, protégée par `CRON_SECRET`)

### Variables d'environnement

| Nom | Rôle |
|---|---|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_KEY` | Clé Supabase (utilisée côté serveur seulement) |
| `APP_URL` | Adresse publique de l'application (liens de confirmation, logo des courriels) |
| `CRON_SECRET` | Secret de la tâche planifiée des relances |

### Pour passer en production

- Brancher un service d'envoi (courriel et SMS) dans `recordMessage` (`src/lib/onboarding.ts`).
- Remplacer la clé publique par une clé serveur Supabase et restreindre les politiques RLS.
- Ajouter une connexion pour l'équipe.
