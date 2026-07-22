-- ============================================================
-- seed.sql
-- Rôle 5 — Jeu de données de démonstration
-- À exécuter après les 4 migrations, une fois le schéma et les
-- policies en place. Reprend les données de src/data/mockData.js
-- pour que le staging ait un contenu réaliste dès le J2.
--
-- Note : on insère directement dans auth.users pour disposer de
-- comptes de démo sans passer par l'inscription réelle (pratique
-- uniquement pour du seed de démonstration, jamais en production).
-- ============================================================

-- ----------------------------------------------------------
-- Comptes de démo (auth.users)
-- ----------------------------------------------------------
insert into auth.users (id, phone, created_at)
values
  ('00000000-0000-0000-0000-000000000001', '+2250700000001', now()), -- Agence Étoile du Foyer
  ('00000000-0000-0000-0000-000000000002', '+2250700000002', now()), -- Vivier Confiance
  ('00000000-0000-0000-0000-000000000003', '+2250700000003', now()), -- Maison Sereine
  ('00000000-0000-0000-0000-000000000010', '+2250700000010', now())  -- Famille Koné (ménage)
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- Agences
-- ----------------------------------------------------------
insert into agences (id, user_id, nom, telephone, quartier, description, note_moyenne)
values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Agence Étoile du Foyer', '2250700000001', 'Cocody',
   'Agence familiale active à Cocody depuis 2016, spécialisée dans la garde d''enfants.',
   4.6),
  ('10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002',
   'Vivier Confiance', '2250700000002', 'Marcory',
   'Agence de placement de nounous et d''aides ménagères à Marcory.',
   4.3),
  ('10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   'Maison Sereine', '2250700000003', 'Yopougon',
   'Plus grand vivier de nounous certifiées de Yopougon.',
   4.9)
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- Nounous
-- Téléphone renseigné mais sans user_id : simule l'état réel après
-- ajout par l'agence, avant la 1ère connexion OTP de la nounou.
-- Testez ensuite le rattachement automatique en vous connectant avec
-- l'un de ces numéros (profil "Nounou") -> claim_nounou_profile()
-- doit lier le compte à la ligne correspondante.
-- ----------------------------------------------------------
insert into nounous (id, agence_id, nom, experience, langues, tarif, quartier, disponible, telephone)
values
  ('20000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   'Mariam T.', '3 ans', array['Français', 'Dioula'], 50000, 'Cocody', true, '2250700000004'),
  ('20000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   'Fatou C.', '5 ans', array['Français', 'Baoulé'], 65000, 'Cocody', true, '2250700000005'),
  ('20000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000003',
   'Adjoua Y.', '2 ans', array['Français'], 40000, 'Yopougon', false, '2250700000006')
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- Ménage de démo
-- ----------------------------------------------------------
insert into menages (id, user_id, nom, telephone, quartier)
values
  ('30000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'Famille Koné', '2250700000010', 'Cocody')
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- Demandes
-- ----------------------------------------------------------
insert into demandes (id, agence_id, menage_id, quartier, besoin, temps, logement, statut, nounou_assignee_id)
values
  ('40000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Cocody', 'Garde d''enfants', 'Temps plein', 'Non logée', 'En attente', null),
  ('40000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'Cocody', 'Aide ménagère', 'Temps partiel', 'Non logée', 'Assignée',
   '20000000-0000-0000-0000-000000000002')
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- Avis (déclenche les triggers de mise à jour des notes moyennes)
-- ----------------------------------------------------------
insert into avis (nounou_id, menage_id, note, commentaire)
values
  ('20000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   5, 'Très ponctuelle et attentionnée avec mes enfants.'),
  ('20000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   5, 'Nounou sérieuse, je recommande vivement.');

-- ----------------------------------------------------------
-- Historique de recherche
-- ----------------------------------------------------------
insert into recherches (menage_id, quartier, besoin, temps, logement)
values
  ('30000000-0000-0000-0000-000000000001', 'Cocody', 'Garde d''enfants', 'Temps plein', 'Non logée'),
  ('30000000-0000-0000-0000-000000000001', 'Marcory', 'Aide ménagère', 'Temps partiel', 'Non logée');

-- ============================================================
-- Vérification rapide après exécution :
-- select * from agence_stats;
-- select * from rechercher_agences('Cocody');
-- ============================================================
