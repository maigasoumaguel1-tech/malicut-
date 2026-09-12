# MaliCut V8 — dépôt complet

Tout est regroupé dans ce dépôt : authentification, profils, publication vidéo,
miniatures, stockage Supabase, flux communauté, recherche, populaires,
likes, commentaires, abonnements, notifications, statistiques et éditeur vidéo.

## Supabase
1. Ouvre Supabase → SQL Editor.
2. Exécute `supabase_schema.sql` en entier.
3. Dans Render, configure :
   - `SUPABASE_URL` = URL du projet Supabase.
   - `SUPABASE_PUBLISHABLE_KEY` = clé `sb_publishable_...`.
4. Ne mets jamais une clé Secret/service_role dans le navigateur ou GitHub.

## Render
Start command : `python malicut.py`
Le fichier `render.yaml` est inclus.

## ZIP
Le ZIP est uniquement un emballage pour transférer le dépôt.
Après extraction, GitHub doit recevoir les fichiers extraits, pas le ZIP à l'intérieur.
Tu peux supprimer le ZIP après avoir vérifié l'extraction. C'est normal et sans danger :
le ZIP n'est pas nécessaire au fonctionnement de MaliCut une fois les fichiers extraits.
