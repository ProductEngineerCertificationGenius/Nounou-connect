# ADR 0001 : Architecture BaaS pour le MVP

## Statut
Accepte

## Resume

| Aspect | Detail |
|---|---|
| Contexte | Delai de 5 jours, equipe sans experience backend, contraintes reseau et materiel du terrain africain |
| Decision | Architecture Backend-as-a-Service (BaaS) via Supabase, sans backend applicatif custom |
| Alternative ecartee | Backend custom (Node/Express ou NestJS) developpe from scratch |
| Statut de la decision | Acceptee pour le MVP et le pilote |

## Contexte
L'equipe doit livrer un produit fonctionnel en 5 jours. Sur les 9 membres, 4 sont mobilises activement sur le developpement, avec l'aide d'outils d'IA, mais sans experience prealable significative en developpement backend. Le projet s'inscrit dans un contexte de connectivite et de ressources limitees typique du marche africain, ou la fiabilite et la rapidite de mise en oeuvre priment sur la sophistication technique initiale.

Le produit necessite neanmoins des fonctions backend standards : base de donnees, authentification des utilisateurs (menages, nounous, agences), stockage d'images de profil, et exposition d'une API consommable par le frontend.

## Decision
Le MVP repose sur une architecture Backend-as-a-Service (BaaS), via Supabase, sans backend applicatif custom. Le frontend React communique directement avec les services manages (base de donnees, authentification, stockage, API auto-generee).

## Justification
Cette approche elimine la necessite d'ecrire, securiser et maintenir un serveur applicatif dans un delai tres court. Elle reduit le risque d'erreurs techniques bloquantes pour une equipe en phase d'apprentissage, et permet de concentrer l'effort de developpement sur la fonctionnalite de valeur du produit (la mise en relation et la verification de confiance) plutot que sur l'infrastructure serveur.

## Consequences

| Type | Impact |
|---|---|
| Positif | Vitesse de livraison, moins de risque de blocage technique, moins de code a maintenir |
| Positif | Base PostgreSQL standard et portable, facilitant une evolution future |
| A surveiller | Dependance a un service tiers pour l'hebergement des donnees critiques |
| A surveiller | Necessite une configuration rigoureuse des regles de securite (Row Level Security) des le MVP |
| A prevoir en V2 | Logique metier complexe (matching avance, workflows d'agence, paiement integre) a porter par une couche applicative additionnelle |
