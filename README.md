# MaliCut V6 — Fondation multi-utilisateurs 🇲🇱

Cette version conserve l'éditeur MaliCut V5 et prépare le passage à une vraie plateforme multi-utilisateurs.

## Chapitre 1 livré
- Connexion par email + mot de passe
- Inscription avec nom et nom d'utilisateur
- Session persistante via Supabase Auth
- Déconnexion
- Profil relié à la base PostgreSQL Supabase
- Schéma préparé pour vidéos, miniatures, likes, commentaires, abonnements, notifications, signalements et rôles admin/modérateur
- RLS (Row Level Security) dans `supabase_schema.sql`

## Architecture choisie
- Render : héberge le serveur Python et l'interface
- Supabase Auth : comptes et sessions
- Supabase PostgreSQL : données sociales
- Supabase Storage : vidéos et miniatures (à brancher au chapitre Publications)

Le serveur MaliCut ne contient **aucune clé service_role**. La clé publique/publishable Supabase peut être utilisée côté navigateur, mais les tables restent protégées par RLS.

## Mise en route
1. Créer un projet Supabase.
2. Ouvrir **SQL Editor** et exécuter tout `supabase_schema.sql`.
3. Dans Supabase, récupérer l'URL du projet et la clé publishable/anon.
4. Dans Render > malicut- > Environment, ajouter :
   - `SUPABASE_URL` = URL du projet
   - `SUPABASE_ANON_KEY` = clé publique/publishable
5. Redéployer.

## Prochains chapitres
- V7 : publication réelle + stockage vidéo + miniature + feed
- V8 : likes + commentaires + abonnements réels
- V9 : recherche + populaires + tendances
- V10 : notifications + statistiques créateurs
- V11 : modération + espace administrateur
- V12 : sécurité, performances, gros fichiers et finition

Pour les vidéos de plus de quelques Mo, le stockage devra utiliser l'upload adapté/resumable de Supabase Storage plutôt que de faire transiter les gros fichiers par Render.
