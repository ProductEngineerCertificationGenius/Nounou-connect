# Debug — voir les erreurs brutes (non traduites)

## Contexte

Depuis la mise à jour de `src/lib/errorHandler.ts`, toutes les erreurs
affichées à l'utilisateur (via `alert(...)` ou un message sous un
formulaire) passent par la fonction `getErrorMessage(error)`. Elle
traduit les erreurs techniques (Postgres, Supabase, réseau...) en
phrases compréhensibles en français, par exemple :

| Erreur brute (avant)                                                         | Message affiché maintenant                                              |
|--------------------------------------------------------------------------------|---------------------------------------------------------------------------|
| `new row violates row-level security policy for table "nounous"`             | Vous n'avez pas les droits nécessaires pour effectuer cette action.       |
| `duplicate key value violates unique constraint "nounous_user_id_key"`       | Cette information existe déjà.                                            |
| `null value in column "quartier" violates not-null constraint`               | Certains champs obligatoires sont manquants.                              |
| `Failed to fetch`                                                             | Problème de connexion. Vérifiez votre connexion internet et réessayez.    |
| tout le reste (message inconnu, technique)                                   | Une erreur est survenue. Veuillez réessayer.                              |

C'est parfait pour un utilisateur final, mais ça peut cacher
l'information dont **toi**, développeur, as besoin pour comprendre ce
qui se passe réellement pendant le debug (le vrai message Postgres, le
code d'erreur `23505`/`42501`/etc., le détail exact renvoyé par
Supabase).

## Comment réactiver le message brut

Ouvre `src/lib/errorHandler.ts` et repère cette ligne, tout en haut du
fichier :

```ts
const SHOW_RAW_ERRORS = false;
```

Remplace-la (en dur, "à la main") par :

```ts
const SHOW_RAW_ERRORS = true;
```

Sauvegarde, relance le serveur de dev si besoin (`npm run dev`). À
partir de là, **toutes** les erreurs affichées dans l'app (alertes,
messages sous les formulaires) redeviennent le message brut, préfixé
par `[DEBUG]`, avec le code d'erreur Postgres entre parenthèses quand
il existe. Exemple :

```
[DEBUG] new row violates row-level security policy for table "nounous" (code: 42501)
```

## ⚠️ À ne pas oublier

- **Ne jamais laisser `SHOW_RAW_ERRORS = true` en production.** Un
  message Postgres brut peut révéler des détails internes (noms de
  tables, de colonnes, de contraintes) qui n'ont rien à faire devant
  un utilisateur final.
- Une fois le debug terminé, repasse la valeur à `false` avant de
  commit/déployer. Un simple `grep -rn "SHOW_RAW_ERRORS" src/` permet
  de vérifier en un coup d'œil qu'il n'y a qu'une seule occurrence et
  qu'elle est bien à `false` avant de livrer.

## Alternative sans toucher au code : la console

Tu n'as pas toujours besoin de passer par `SHOW_RAW_ERRORS`. Plusieurs
endroits du code font déjà un `console.error(...)` avec l'erreur
complète avant de l'afficher à l'utilisateur (ex: `RechercheNounou.tsx`,
`useAuth.ts`). Ouvre simplement la console du navigateur
(F12 → onglet "Console") : le message technique complet y est déjà
visible, sans rien modifier dans le code. C'est la méthode à préférer
au quotidien — réserve `SHOW_RAW_ERRORS = true` aux cas où l'erreur
n'a pas de `console.error` associé.
