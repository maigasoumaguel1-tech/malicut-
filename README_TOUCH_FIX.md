# MaliCut V8 — Correctif des touches

Ajoute `malicut_v8_touch_fix.js` dans le dépôt, puis dans `app.html`, juste avant `</body>` :

<script src="malicut_v8_touch_fix.js"></script>

Ce fichier ne remplace pas le serveur ni Supabase. Il ajoute une gestion robuste des clics/touch
et de la navigation.

Important : si le V8 actuel utilise une structure HTML/JS différente, ce correctif peut nécessiter
une adaptation aux IDs exacts. Il est donc préférable de tester après déploiement avant de supprimer
les anciens fichiers.
