# ADR 0004 : PWA comme format d'application

## Statut
Accepte

## Resume

| Aspect | Detail |
|---|---|
| Contexte | Smartphones Android d'entree de gamme, connexion instable, delai de 5 jours |
| Decision | Progressive Web App (PWA), installable depuis le navigateur |
| Alternative ecartee | Application native (Google Play, App Store) |
| Raison principale | Pas de delai de validation externe, installation en un geste, fonctionnement partiel hors-ligne |

## Contexte
Le public cible utilise majoritairement des smartphones Android d'entree de gamme, avec une connexion reseau instable et une consommation de donnees couteuse. Une part importante des utilisateurs n'est pas familiere avec des interfaces complexes. Le delai de 5 jours ne permet pas d'envisager le developpement et la publication d'une application native sur les stores (Google Play, App Store), qui impliquent des delais de validation et une complexite technique supplementaire.

## Decision
Le produit est developpe comme une Progressive Web App (PWA), installable directement depuis le navigateur, sans passage par un store d'applications.

## Justification
La PWA permet a l'utilisateur d'installer l'application sur son ecran d'accueil en un geste simple, sans creer de compte sur un store, sans telechargement lourd, et sans processus de validation externe. Elle permet egalement un fonctionnement partiellement hors-ligne (mise en cache des pages deja consultees), ce qui repond directement a la contrainte de connectivite instable. Ce format est compatible avec le delai de livraison du MVP, contrairement a une application native.

## Consequences

| Type | Impact |
|---|---|
| Limite MVP | Experience hors-ligne basique (mise en cache simple), synchronisation avancee reportee |
| Limite | Absence sur les stores officiels, ce qui peut limiter la decouvrabilite pour certains utilisateurs |
| Evolution possible | Migration vers une application native (React Native) en V2 si le besoin est confirme par le pilote |
