# MaliCut V8 — dépôt fonctionnel corrigé

Version reconstruite à partir du dépôt V8 travaillé dans cette conversation.

## Correction principale
Le JavaScript V8 contenait une erreur de syntaxe dans `renderPost()` et `toggleComments()`. Cette erreur empêchait tout le script JavaScript de s'exécuter, ce qui expliquait pourquoi les boutons et menus ne réagissaient plus.

Les fonctions ont été corrigées sans supprimer les fonctionnalités V8.

## Fichiers à mettre dans le dépôt GitHub
- `app.html`
- `malicut.py`
- `requirements.txt`
- `render.yaml`
- `supabase_schema.sql`
- `favicon.svg`

Ne pas ajouter l'ancien `malicut_v8_touch_fix.js` : la panne principale était dans le JavaScript du V8.

## Render
Start command : `python malicut.py`

Après l'envoi des fichiers sur la branche `principal`, utiliser `Deploy latest commit` dans Render.
