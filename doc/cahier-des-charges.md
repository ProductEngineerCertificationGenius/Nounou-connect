# Cahier des charges fonctionnel

## Nounou Connect - Mise en relation nounous / menages

---

## 1. Presentation du projet

Nounou Connect est une application mobile (PWA) qui met en relation des menages a la recherche d'une nounou (garde d'enfants et/ou aide menagere) avec des agences de placement et leur vivier de nounous.

Le produit ne se limite pas a lister des profils disponibles. Il repond a un probleme plus profond : le manque de confiance dans le recrutement informel actuel, aujourd'hui base sur le bouche-a-oreille et des groupes WhatsApp non structures, sans aucune garantie sur la fiabilite des personnes mises en relation.

Cette premiere version du produit est concue comme un **pilote**, destine a etre teste avec un nombre restreint d'agences partenaires avant tout deploiement plus large.

---

## 2. Contexte et enjeux

En Cote d'Ivoire comme dans de nombreux pays d'Afrique de l'Ouest, la recherche d'une nounou passe presque toujours par un reseau informel : une voisine, un groupe WhatsApp de quartier, une connaissance qui recommande une personne. Ce systeme fonctionne, mais presente des limites fortes :

- Aucune verification structuree de l'identite ou du serieux de la personne recommandee
- Aucune tracabilite des experiences precedentes (bonnes ou mauvaises)
- Une mise en relation qui repose entierement sur la confiance personnelle de l'intermediaire, sans systeme de recours en cas de probleme

Les agences de placement existantes disposent deja d'un vivier de nounous et d'une connaissance de leur serieux, mais restent peu digitalisees et peu visibles au-dela de leur reseau local.

Nounou Connect vise a combiner la confiance deja etablie par les agences avec la portee et la simplicite d'une plateforme numerique.

---

## 3. Public cible

| Profil | Description | Besoin principal |
|---|---|---|
| Menage | Parent ou famille a la recherche d'une nounou pour la garde d'enfants et/ou l'aide menagere | Trouver rapidement une personne fiable, sans avoir a verifier elle-meme les references |
| Agence | Organisation de placement qui gere un vivier de nounous | Gagner en visibilite et recevoir des demandes de menages au-dela de son reseau habituel |
| Nounou | Personne proposant des services de garde d'enfants et/ou d'aide menagere, rattachee a une agence | Etre visible et recevoir des propositions de mission, meme sans smartphone personnel |

---

## 4. Objectifs du projet

- Offrir aux menages un moyen simple et rapide de trouver une nounou via une agence de confiance
- Donner aux agences de placement un outil pour digitaliser et faire connaitre leur vivier de nounous
- Permettre aux nounous d'etre visibles et sollicitees, y compris celles ne disposant pas d'un smartphone
- Remplacer une partie du recrutement informel actuel par un canal plus structure, sans en supprimer la simplicite d'usage

---

## 5. Fonctionnalite phare : le badge de confiance

La fonctionnalite centrale du produit est le **badge de confiance**, affiche sur chaque profil de nounou.

Pour ce MVP, la verification n'est pas realisee par l'equipe du produit, mais **directement par l'agence de placement partenaire**, qui engage sa reputation en presentant une nounou sur la plateforme. Chaque agence est responsable de la fiabilite des informations et des references qu'elle declare pour les nounous de son vivier.

Le badge de confiance repose sur :

| Element | Description |
|---|---|
| Rattachement a une agence | Chaque nounou visible sur la plateforme est presentee et garantie par une agence identifiee |
| Informations declarees par l'agence | Experience, langues parlees, tarif, disponibilite |
| Note moyenne | Calculee a partir des avis laisses par les menages ayant utilise la plateforme |

Ce fonctionnement permet de lancer rapidement le produit sans mobiliser une equipe de verification interne, tout en s'appuyant sur la credibilite deja existante des agences partenaires aupres de leur clientele habituelle.

---

## 6. Fonctionnalites par profil utilisateur

### Menage

- Creation de compte simple (telephone, nom, quartier)
- Recherche guidee par criteres (quartier, type de besoin, temps de travail, logement)
- Consultation des agences et des profils de nounous correspondant a la recherche
- Prise de contact directe via WhatsApp
- Notation de l'experience apres la mise en relation
- Consultation de l'historique de ses recherches passees

### Agence

- Creation de compte (telephone, nom de l'agence, quartier)
- Gestion de son vivier de nounous : ajout, modification, mise a jour de la disponibilite
- Consultation des demandes recues de la part des menages
- Assignation d'une nounou disponible a une demande recue
- Suivi de son activite (nombre de nounous, demandes recues, placements realises)

### Nounou

- Compte cree et rattache a une agence d'assignation (le compte peut etre cree par la nounou elle-meme ou par l'agence pour son compte)
- Informations de profil : experience, langues parlees, tarif souhaite, quartier
- Indication de son statut de disponibilite
- Consultation des avis recus des familles
- Consultation de l'historique des demandes qui lui ont ete assignees

---

## 7. Parcours utilisateur

### Parcours Menage

Une mere de famille ouvre l'application a la recherche d'une nounou pour la garde de ses deux enfants. Elle cree un compte en indiquant son numero de telephone, son nom et son quartier. Elle lance une recherche en precisant son besoin : garde d'enfants, temps plein, non logee. L'application lui presente les agences actives dans son quartier avec leur note moyenne et le nombre de nounous disponibles. Elle consulte le profil d'une agence, puis celui d'une nounou proposee : experience, langues parlees, tarif, avis des familles precedentes. Elle appuie sur "Contacter", ce qui ouvre directement une conversation WhatsApp avec l'agence. Quelques jours plus tard, elle recoit une notification lui demandant de noter son experience.

### Parcours Nounou

Une nounou est presentee sur la plateforme par l'agence a laquelle elle est rattachee. Son profil (experience, langues, quartier, tarif, disponibilite) est visible par les menages en recherche. Lorsqu'elle est sollicitee, c'est l'agence qui recoit la demande et gere la mise en relation avec le menage, ce qui permet a une nounou sans smartphone d'etre tout de meme visible et proposee. Si elle dispose elle-meme d'un compte, elle peut mettre a jour son statut de disponibilite et consulter les avis laisses par les familles pour lesquelles elle a travaille.

### Parcours Agence

Le responsable d'une agence de placement cree un compte pour son organisation. Il ajoute les nounous de son vivier une a une, avec leurs informations principales (experience, langues, quartier, tarif, disponibilite). Lorsqu'un menage effectue une recherche correspondant a son profil, l'agence apparait dans les resultats. Elle recoit les demandes de mise en relation directement via WhatsApp et peut assigner la nounou la plus adaptee a chaque demande. Elle suit egalement, depuis un tableau de bord simple, le nombre de nounous actives, les demandes recues et les placements realises.

---

## 8. Regles de gestion

| Situation | Regle appliquee |
|---|---|
| Une nounou n'est plus disponible | L'agence met a jour son statut, elle n'apparait plus dans les nouvelles recherches |
| Une agence n'a plus de nounou disponible pour un besoin donne | La demande du menage reste visible dans la liste des demandes recues, sans assignation automatique |
| Un menage souhaite contacter une agence | Le contact se fait exclusivement via WhatsApp, aucune messagerie interne n'est proposee |
| Un menage n'a pas note son experience | Une relance simple est envoyee quelques jours apres la mise en contact, sans caractere obligatoire |
| Une nounou change d'agence | Non gere dans cette version, le profil reste rattache a l'agence qui l'a initialement enregistree |

---

## 9. Contraintes et perimetre du MVP

Cette premiere version du produit est volontairement limitee, afin de permettre un lancement rapide et de valider les hypotheses de base avant d'investir davantage.

| Element | Choix pour le MVP | Raison |
|---|---|---|
| Geolocalisation | Non utilisee, quartier choisi via une liste deroulante | Simplicite d'usage et independance vis-a-vis de la qualite du reseau |
| Messagerie interne | Non presente, contact direct via WhatsApp | Canal deja maitrise par les utilisateurs, fiable meme en connexion instable |
| Paiement | Non integre, arrangement direct entre les parties | Reduction de la complexite technique et reglementaire au lancement |
| Verification d'antecedents officielle | Non disponible, verification basee sur la declaration de l'agence partenaire | Absence d'infrastructure nationale fiable et accessible rapidement |
| Fonctionnement hors-ligne | Cache basique des pages deja consultees uniquement | Suffisant pour une premiere version, evite une complexite technique inutile |

Ce perimetre restreint doit etre communique clairement aux agences partenaires impliquees dans le pilote : le produit est en phase de test, et certaines garanties (verification poussee, cadre contractuel, paiement securise) ne sont pas encore disponibles.

---

## 10. Feuille de route V2

Une fois le pilote valide aupres des premieres agences partenaires, les evolutions suivantes sont envisagees :

- Integration du paiement mobile money
- Ajout d'une messagerie interne a l'application
- Generation automatique d'un contrat ou d'une fiche de poste type
- Systeme de remplacement rapide en cas d'absence d'une nounou
- Mecanisme de parrainage entre nounous
- Ligne d'assistance et de signalement structuree pour les cas de litige

---

## 11. Glossaire

| Terme | Definition |
|---|---|
| Badge de confiance | Indicateur affiche sur le profil d'une nounou, garanti par l'agence qui la presente sur la plateforme |
| Agence partenaire | Organisation de placement qui gere un vivier de nounous et les rend visibles sur la plateforme |
| Pilote | Phase de test du produit avec un nombre restreint d'utilisateurs, avant un deploiement plus large |
| Vivier | Ensemble des nounous rattachees a une agence donnee |

---

Fin du cahier des charges fonctionnel.
