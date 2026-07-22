# CAHIER DES CHARGES — NounouConnect

*L'application qui met en relation les familles et les nounous disponibles, en temps réel.*

**Projet MVP — Application mobile (PWA)**
**Rédigé par :** Koffi Nango Christ Angenor
**Version 1.0 — Juillet 2026**

---

## Sommaire

1. [Présentation générale du projet](#1-présentation-générale-du-projet)
2. [Description fonctionnelle](#2-description-fonctionnelle)
3. [Spécifications techniques](#3-spécifications-techniques)
4. [Exigences non fonctionnelles](#4-exigences-non-fonctionnelles)
5. [Sécurité et confiance](#5-sécurité-et-confiance)
6. [Modèle économique](#6-modèle-économique)
7. [Contraintes du projet](#7-contraintes-du-projet)
8. [Livrables attendus et évolutions futures](#8-livrables-attendus-et-évolutions-futures)
9. [Critères de validation du MVP](#9-critères-de-validation-du-mvp)
10. [Annexes](#10-annexes)

---

## 1. Présentation générale du projet

### 1.1 Contexte

Trouver une nounou disponible dans l'urgence est aujourd'hui difficile : appels multiples, recherche sur les réseaux sociaux, bouche-à-oreille. Les familles manquent d'un moyen rapide et fiable d'identifier une aide disponible à proximité, que ce soit pour un besoin ponctuel (urgence, sortie de dernière minute) ou pour une garde régulière.

NounouConnect répond à ce besoin en connectant instantanément les parents avec des nounous disponibles à proximité, sur le principe d'une application de VTC, appliqué à la garde d'enfants et à l'aide à domicile.

### 1.2 Objectifs du projet

- Permettre à un parent de trouver une nounou disponible en quelques minutes.
- Fiabiliser la mise en relation grâce à des profils vérifiés et un système d'avis.
- Simplifier la réservation, immédiate ou planifiée.
- Livrer un MVP fonctionnel et testable en 5 jours, avec les moyens humains et techniques disponibles.

### 1.3 Principes fondateurs du produit

Le produit repose sur trois piliers :

- Disponibilité en temps réel des nounous (statut activable en un clic).
- Confiance, via des profils vérifiés (pièce d'identité, références) et un système d'avis mutuel.
- Simplicité de réservation, avec un minimum d'écrans et de friction.

### 1.4 Périmètre du projet (MVP)

**Inclus :** recherche géolocalisée, filtres, fiches profils, mise en relation via WhatsApp, réservation, système d'avis, gestion de disponibilité côté nounou.

**Exclu du MVP (reporté en V2) :** messagerie interne temps réel, paiement intégré à l'application, application native sur les stores, matching avancé, workflows d'agence complexes.

Le paiement intégré et la messagerie interne, mentionnés dans la vision produit long terme, sont volontairement exclus du périmètre du MVP pour tenir le délai de livraison de 5 jours (voir ADR 0001 et 0005 en annexe).

### 1.5 Parties prenantes

| Partie prenante | Rôle |
|---|---|
| Parents (ménages) | Utilisateurs recherchant une nounou / une aide à domicile |
| Nounous / aides à domicile | Utilisateurs proposant leurs services |
| Agences de placement | Organisations pouvant référencer plusieurs nounous |
| Équipe projet | 9 membres, dont 4 mobilisés activement sur le développement |

---

## 2. Description fonctionnelle

### 2.1 Profils utilisateurs

- **Parent** : recherche une nounou, réserve, échange, note la prestation.
- **Nounou / aide à domicile** : gère sa disponibilité, reçoit et accepte des demandes, est notée.
- **Agence** (évolution possible) : référence et gère plusieurs profils de nounous.

### 2.2 Fonctionnalités — côté parents

- Recherche instantanée des nounous disponibles à proximité (géolocalisation).
- Filtres par expérience, tarif, disponibilité, langues parlées, compétences (biberon, devoirs, ménage léger…).
- Fiche détaillée de chaque nounou : avis, badges de vérification, expérience.
- Prise de contact directe via WhatsApp (bouton « Contacter »).
- Réservation immédiate (« maintenant ») ou planifiée à l'avance.
- Suivi de l'arrivée de la nounou, dans la mesure permise par le MVP.
- Attribution d'une note et d'un avis après la mission.

### 2.3 Fonctionnalités — côté nounous

- Statut « disponible / indisponible » activable en un clic.
- Réception de demandes avec possibilité d'accepter ou de refuser.
- Profil professionnel avec certifications (premiers secours, expérience, références).
- Historique des missions.
- Système de notation mutuelle parents ↔ nounous.

### 2.4 Parcours utilisateur (comment ça marche)

1. Le parent ouvre l'application et indique son besoin (garde, aide à la maison, ou les deux), la durée et le lieu.
2. L'application propose les nounous disponibles à proximité, classées par note, distance et tarif.
3. Le parent choisit un profil et le contacte via le bouton WhatsApp intégré, ou réserve directement.
4. La nounou confirme sa disponibilité.
5. À l'issue de la mission, chacun laisse un avis.

Le paiement automatique et le suivi en temps réel de l'arrivée, évoqués dans la vision produit, constituent des évolutions envisagées après validation du MVP par un pilote (voir section 8 — Évolutions futures).

### 2.5 Règles de gestion

- Une nounou ne peut apparaître dans les résultats de recherche que si son statut est « disponible ».
- Un profil nounou doit être vérifié (pièce d'identité) avant publication.
- Un avis ne peut être laissé qu'après une mise en relation effective.

---

## 3. Spécifications techniques

Les choix ci-dessous sont documentés en détail dans les Architecture Decision Records (ADR) du projet, joints en annexe.

### 3.1 Architecture générale

**Décision :** architecture Backend-as-a-Service (BaaS), sans backend applicatif développé sur mesure pour le MVP (ADR 0001).

Ce choix s'explique par un délai de livraison de 5 jours et une équipe de développement sans expérience préalable significative en backend. Il permet de concentrer l'effort sur les fonctionnalités à valeur (mise en relation, vérification de confiance) plutôt que sur l'infrastructure serveur.

### 3.2 Fournisseur BaaS

**Décision :** Supabase, avec base de données PostgreSQL (ADR 0002).

- Base relationnelle adaptée aux données du produit (nounou, agence, avis, mise en relation) et aux recherches par critères croisés.
- Authentification par téléphone.
- Règles de sécurité fines (Row Level Security) à définir pour chaque table.
- Stockage des images de profil.
- API générée automatiquement à partir des tables.
- Base portable vers un backend applicatif dédié en V2, sans restructuration majeure des données.

### 3.3 Frontend

**Décision :** React + Vite (ADR 0003), sous forme de Progressive Web App — PWA (ADR 0004).

- Bundle léger et démarrage rapide, adaptés aux smartphones d'entrée de gamme et aux connexions instables.
- Installation depuis le navigateur, en un geste, sans passage par un store d'application.
- Fonctionnement partiellement hors-ligne (mise en cache des pages déjà consultées).
- Pas de rendu serveur (SEO non prioritaire à ce stade, accès principal via liens directs et WhatsApp).

### 3.4 Stack complémentaire frontend (ADR 0006)

| Librairie | Rôle |
|---|---|
| vite-plugin-pwa | Génération du manifest et du service worker (installation, cache hors-ligne) |
| React Query (TanStack Query) | Appels API Supabase : cache, chargement, erreurs, tentatives automatiques |
| Zustand | État global léger (utilisateur connecté : parent, nounou, agence) |
| React Hook Form | Gestion et validation des formulaires (inscription, recherche guidée) |
| Tailwind CSS | Mise en forme rapide de l'interface |

### 3.5 Canal de mise en relation

**Décision :** lien direct WhatsApp (format wa.me) via un bouton « Contacter », plutôt qu'une messagerie interne temps réel (ADR 0005).

- Fiabilité en connexion instable, sans développement de messagerie.
- Limite acceptée : historique des échanges non centralisé dans l'application.
- Compensation possible : enregistrement d'un évènement de contact (date, utilisateurs concernés) à des fins statistiques.

---

## 4. Exigences non fonctionnelles

### 4.1 Performance et légèreté

- Application optimisée pour des smartphones Android d'entrée de gamme.
- Consommation de données minimisée (contrainte de connexion coûteuse et instable).

### 4.2 Disponibilité hors-ligne

- Mise en cache des pages déjà consultées.
- Synchronisation avancée hors-ligne reportée en V2.

### 4.3 Ergonomie

- Interface volontairement simple : nombre restreint d'écrans et de fonctionnalités par écran.
- Prise en main adaptée à des utilisateurs peu familiers des interfaces complexes.

### 4.4 Sécurité des données

- Règles de sécurité au niveau des lignes (Row Level Security) configurées dès le MVP sur chaque table sensible.
- Vérification d'identité obligatoire pour toute nounou avant publication du profil.

---

## 5. Sécurité et confiance

- Vérification d'identité (pièce d'identité) obligatoire pour toutes les nounous.
- Vérification des références et, si disponible, du casier judiciaire.
- Système d'avis et de notation après chaque mission.
- Partage de position en temps réel pendant la garde, consultable par le parent (évolution envisagée selon le pilote).
- Numéro d'urgence accessible depuis l'application (évolution envisagée).
- Assurance responsabilité civile incluse pendant les missions (aspect contractuel, hors périmètre technique du MVP).

---

## 6. Modèle économique

L'application prélève une commission sur chaque mission réalisée (par exemple entre 15 et 20 %), prélevée lors du paiement. Une offre d'abonnement mensuel pourra être proposée aux familles ayant un besoin régulier, avec des tarifs préférentiels et un accès prioritaire aux nounous les mieux notées.

Le paiement intégré et automatisé n'étant pas dans le périmètre technique du MVP (absence de messagerie et de paiement intégrés, voir section 1.4), ce modèle économique s'applique pleinement à partir de la V2.

---

## 7. Contraintes du projet

### 7.1 Délai

Développement du MVP en 5 jours.

### 7.2 Équipe

9 membres au total, dont 4 mobilisés activement sur le développement, assistés d'outils d'IA, sans expérience préalable significative en développement backend.

### 7.3 Contraintes utilisateurs finaux

- Smartphones Android majoritairement d'entrée de gamme.
- Connexion réseau instable et coûteuse en données.
- Public pas toujours familier des interfaces numériques complexes.

### 7.4 Contraintes budgétaires

Solution BaaS (Supabase) retenue notamment pour limiter les coûts et le temps de mise en œuvre initiaux ; un passage à un plan payant est à anticiper au-delà de certains seuils d'usage (stockage, requêtes, utilisateurs actifs).

---

## 8. Livrables attendus et évolutions futures

### 8.1 Livrables du MVP

- Application PWA fonctionnelle (recherche, fiches profils, contact WhatsApp, réservation, avis).
- Base de données Supabase configurée avec règles de sécurité (RLS).
- Documentation technique (ADR) des choix d'architecture.

### 8.2 Prochaines étapes

- Créer une maquette de l'interface (écrans principaux : recherche, profil, réservation, contact).
- Finaliser le schéma des tables et les règles de sécurité Supabase.
- Mettre en place un système de vérification des nounous avant le lancement.
- Tester l'application avec un groupe pilote de familles et de nounous avant un déploiement plus large.

### 8.3 Évolutions envisagées en V2

- Paiement intégré à l'application.
- Messagerie interne temps réel.
- Suivi en temps réel de l'arrivée de la nounou.
- Backend applicatif dédié pour la logique métier avancée (matching, workflows d'agence).
- Migration possible vers une application native (React Native), si le besoin est confirmé par le pilote.

---

## 9. Critères de validation du MVP

- Un parent peut rechercher et filtrer des nounous disponibles autour d'une position donnée.
- Un parent peut consulter une fiche de profil complète (avis, badges, expérience).
- Un parent peut initier un contact WhatsApp depuis un profil.
- Une nounou peut activer/désactiver son statut de disponibilité.
- Une nounou peut accepter ou refuser une demande.
- Un avis peut être laissé après une mise en relation.
- L'application est installable comme PWA et reste utilisable, au moins en lecture, hors connexion sur les pages déjà visitées.

---

## 10. Annexes

### 10.1 Récapitulatif des Architecture Decision Records (ADR)

| N° | Titre | Statut |
|---|---|---|
| 0001 | Architecture BaaS pour le MVP | Accepté |
| 0002 | Supabase comme fournisseur BaaS | Accepté |
| 0003 | React + Vite comme stack frontend | Accepté |
| 0004 | PWA comme format d'application | Accepté |
| 0005 | WhatsApp comme canal de contact | Accepté |
| 0006 | Stack complémentaire frontend | Accepté |

