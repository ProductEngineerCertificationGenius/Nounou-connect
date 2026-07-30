# ADR 0003 : React + Vite comme stack frontend

## Statut
Accepte

## Resume

| Aspect | Detail |
|---|---|
| Contexte | Application web installable (PWA), utilisateurs sur smartphones d'entree de gamme, connexion reseau instable |
| Decision | React + Vite pour le frontend |
| Alternative ecartee | Next.js (framework oriente rendu serveur et SEO) |
| Raison principale | Bundle plus leger, build plus rapide, pas de besoin fort de SEO |

## Contexte
Le produit doit etre concu comme une application web installable (PWA), destinee a des utilisateurs disposant majoritairement de smartphones d'entree de gamme et d'une connexion reseau instable ou couteuse en donnees. L'interface doit rester volontairement simple, avec un nombre restreint d'ecrans et de fonctionnalites par ecran. L'equipe de developpement dispose de 5 jours et n'a pas d'experience prealable approfondie sur un framework frontend particulier.

## Decision
Le frontend est developpe en React, avec Vite comme outil de build.

## Justification
React est le framework le plus documente et le plus largement adopte, ce qui facilite l'utilisation d'outils d'IA pour accelerer le developpement et faciliter le recrutement futur de developpeurs. Vite permet un temps de demarrage quasi instantane et genere un bundle final plus leger qu'un framework applicatif plus lourd, ce qui repond directement a la contrainte de connexion faible et de devices peu puissants des utilisateurs finaux. Le produit n'a pas de besoin fort de referencement naturel (SEO) a ce stade, l'acces se faisant principalement via des liens directs, du bouche-a-oreille ou WhatsApp, ce qui rend inutile un framework oriente rendu serveur.

## Consequences

| Type | Impact |
|---|---|
| Positif | Code React reutilisable en grande partie en cas de migration future vers React Native |
| A accepter | Absence de rendu serveur limitant le referencement naturel |
| A prevoir | Ajout manuel de certains outils (PWA, routing) via des plugins dedies |
