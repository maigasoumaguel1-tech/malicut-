# MaliCut — préparation Android / Google Play

Ce projet encapsule la version web fonctionnelle de MaliCut dans une application Android Capacitor.

- Nom : MaliCut
- Version : 8.0.0
- Package : com.malicut.app
- URL de production : https://malicut.onrender.com
- Target API requis actuellement pour une nouvelle app Google Play : Android 16 / API 36 (à partir du 31 août 2026).

## Construction

1. Installer Node.js et Android Studio.
2. Dans ce dossier : `npm install`
3. Puis : `npx cap add android`
4. Puis : `npx cap sync android`
5. Ouvrir Android Studio : `npx cap open android`
6. Vérifier compileSdk/targetSdk = 36.
7. Créer une clé de signature privée et conserver le fichier/les mots de passe en sécurité.
8. Générer un Android App Bundle (.aab) signé pour la publication.

## Important

La clé Supabase secrète/service_role ne doit jamais être mise dans cette application.
Le projet utilise l'URL publique de MaliCut pour conserver exactement le comportement de la version web validée.

Si Google Play demande une vérification d'identité ou d'âge pour le compte développeur, elle doit être faite par le titulaire adulte autorisé du compte; ne contournez pas ces contrôles.
