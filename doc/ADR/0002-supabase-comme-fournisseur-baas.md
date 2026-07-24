# ADR 0002 : Supabase comme fournisseur BaaS

## Statut
Accepte

## Resume

| Aspect | Detail |
|---|---|
| Contexte | Architecture BaaS retenue (ADR 0001), donnees naturellement relationnelles (nounou, agence, avis, mise en relation) |
| Decision | Supabase comme fournisseur BaaS pour le MVP et le pilote |
| Base de donnees | PostgreSQL, standard et portable |
| Alternative ecartee | Firebase (base NoSQL Firestore) |

## Contexte
L'architecture BaaS retenue (ADR 0001) necessite un fournisseur concret. Les donnees du produit sont naturellement relationnelles : une nounou peut appartenir a une agence, possede plusieurs avis, plusieurs mises en relation avec des menages, et doit pouvoir etre filtree selon plusieurs criteres croises (zone geographique, disponibilite, note, appartenance a une agence). Le projet prevoit egalement une evolution vers une architecture avec backend applicatif dedie en V2.

## Decision
Supabase est retenu comme fournisseur BaaS pour le MVP et le pilote.

## Justification
Supabase s'appuie sur PostgreSQL, une base de donnees relationnelle standard, particulierement adaptee a la nature des donnees du produit et aux requetes croisees necessaires a la recherche de profils. Cette base est directement portable vers un backend applicatif custom en V2, sans necessiter de restructuration des donnees. Supabase integre egalement une authentification par telephone, un systeme de permissions fines (Row Level Security), un espace de stockage pour les images, et une API generee automatiquement a partir des tables, reduisant fortement le travail de configuration initial.

## Consequences

| Type | Impact |
|---|---|
| A faire | Concevoir le schema des tables avec soin des le depart |
| A faire | Definir explicitement les regles de securite (Row Level Security) pour chaque table |
| A surveiller | Passage a un plan payant au-dela de certains seuils d'usage (stockage, requetes, utilisateurs actifs) |
| Positif long terme | Nature relationnelle de PostgreSQL facilitant l'ajout ulterieur d'une couche applicative sans migration complexe |
