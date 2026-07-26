# ADR 0005 : WhatsApp comme canal de contact

## Statut
Accepte

## Resume

| Aspect | Detail |
|---|---|
| Contexte | Mise en relation menage / nounou ou agence, WhatsApp deja maitrise par le public cible |
| Decision | Lien direct WhatsApp (format wa.me) via bouton Contacter |
| Alternative ecartee | Messagerie interne temps reel dans l'application |
| Raison principale | Fiabilite en connexion instable, zero developpement de messagerie |

## Contexte
Une fois qu'un menage identifie un profil de nounou ou d'agence pertinent, un canal de mise en relation est necessaire. WhatsApp est le canal de communication le plus utilise par le public cible, davantage que les messageries internes propres a une application. Le delai de developpement du MVP est de 5 jours, avec une equipe sans experience prealable en systemes de messagerie temps reel.

## Decision
La mise en relation s'effectue via un lien direct vers WhatsApp (format wa.me), declenche par un bouton "Contacter" sur le profil, plutot que via une messagerie interne a l'application.

## Justification
Ce mecanisme ne necessite aucune integration technique complexe, s'appuie sur un outil deja maitrise par les utilisateurs, et fonctionne de maniere fiable meme en cas de connexion instable, contrairement a une messagerie interne en temps reel qui necessiterait une gestion fine des etats de connexion, des notifications et de la persistance des messages. Ce choix concentre l'effort de developpement du MVP sur la fonctionnalite de valeur du produit plutot que sur une messagerie.

## Consequences

| Type | Impact |
|---|---|
| Limite | Historique des echanges non centralise ni consultable dans l'application |
| Compensation possible | Enregistrement d'un evenement de contact (date, utilisateurs concernes) a des fins statistiques |
| Evolution possible | Ajout d'une messagerie interne complete en V2, si le pilote confirme un besoin reel |
