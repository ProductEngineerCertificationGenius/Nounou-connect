# ADR 0006 : Stack complementaire frontend

## Statut
Accepte

## Resume

| Librairie | Role |
|---|---|
| vite-plugin-pwa | Generation automatique du manifest et du service worker pour l'installation et le cache hors-ligne |
| React Query (TanStack Query) | Gestion des appels API Supabase : cache, chargement, erreurs, tentatives automatiques |
| Zustand | Etat global leger, notamment l'utilisateur connecte (menage, nounou, agence) |
| React Hook Form | Gestion et validation des formulaires (inscription, recherche guidee) |
| Tailwind CSS | Mise en forme rapide de l'interface sans composants graphiques a developper from scratch |

## Contexte
Au-dela du choix de React et Vite (ADR 0003), plusieurs besoins recurrents doivent etre couverts pour livrer une application fonctionnelle et fiable en 5 jours : rendre l'application installable, gerer les echanges de donnees avec Supabase de maniere robuste face a une connexion instable, partager certaines informations (comme l'utilisateur connecte) entre les differents ecrans, et gerer les formulaires de saisie.

## Decision
Les cinq librairies listees ci-dessus completent la stack frontend du MVP.

## Justification
Chacune de ces librairies repond a un besoin technique recurrent du projet sans necessiter de developpement custom, ce qui est determinant compte tenu du delai de 5 jours et du niveau d'experience de l'equipe. Elles sont par ailleurs largement documentees et bien connues des outils d'IA utilises par l'equipe pour accelerer le developpement, ce qui reduit le risque de blocage technique.

## Consequences

| Type | Impact |
|---|---|
| Positif | Gestion robuste des etats reseau (chargement, erreur, absence de connexion) |
| Positif | Poids limite, compatible avec la contrainte de legerete de l'application |
| A noter | Choix consideres comme des details d'implementation, modifiables sans remettre en cause l'architecture generale |
