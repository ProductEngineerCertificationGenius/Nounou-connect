-- ============================================================
-- 0010_advisor_search_path_et_grants.sql
-- Corrige les 3 nouvelles catégories d'alertes du Security Advisor :
--   1. Function Search Path Mutable
--      -> maj_note_moyenne_nounou, maj_note_moyenne_agence,
--         assigner_nounou (rechercher_agences a déjà été corrigée
--         dans 0006, qui posait `set search_path = public`)
--   2. Public Bucket Allows Listing -> storage.photos
--   3. Public / Signed-in Users Can Execute SECURITY DEFINER
--      -> claim_nounou_profile, menage_visible_via_demande,
--         rechercher_agences, assigner_nounou, storage_photo_est_proprietaire
-- À exécuter après 0009_storage_policy_stricte.sql.
-- ============================================================

-- ----------------------------------------------------------
-- [1] Function Search Path Mutable
--
-- Sans `search_path` explicite, une fonction hérite du search_path
-- de la session appelante. Un rôle malveillant pourrait, en théorie,
-- créer un schéma / une fonction homonyme placé en tête de son
-- propre search_path et la faire résoudre à la place de celle
-- attendue (search_path hijacking). On fixe explicitement
-- `search_path = public` sur les 3 fonctions qui ne l'avaient pas.
-- ----------------------------------------------------------
alter function maj_note_moyenne_nounou() set search_path = public;
alter function maj_note_moyenne_agence() set search_path = public;
alter function assigner_nounou(uuid, uuid) set search_path = public;

-- Pour mémoire : rechercher_agences(text, text), claim_nounou_profile(),
-- menage_visible_via_demande(uuid) et storage_photo_est_proprietaire(text)
-- ont déjà `set search_path = public` depuis leur création (0005, 0006,
-- 0007, 0009) — rien à faire dessus pour cette alerte.

-- ----------------------------------------------------------
-- [2] Public Bucket Allows Listing (storage.photos)
--
-- Le bucket `photos` est `public = true` (0004_storage.sql) : ça
-- suffit à autoriser l'affichage des images via l'URL publique
-- déterministe (`getPublicUrl`), SANS passer par le RLS de
-- `storage.objects`. La policy `photos_lecture_publique` (0004),
-- elle, autorise en plus n'importe qui à faire un `select` sur
-- `storage.objects` — donc à lister/énumérer tous les fichiers du
-- bucket via l'API Storage (`.list()`), y compris les métadonnées
-- de fichiers d'autres agences. Ce n'est pas nécessaire pour l'app
-- (le frontend n'a besoin que de connaître une URL publique
-- construite à partir d'un `photo_url` déjà stocké en base, jamais
-- de lister le bucket) : on la remplace par une policy de lecture
-- scoping strictement le "select"/listing aux fichiers dont
-- l'utilisateur connecté est propriétaire, comme pour l'upload.
-- ----------------------------------------------------------
drop policy if exists "photos_lecture_publique" on storage.objects;

create policy "photos_listing_proprietaire_reel"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and storage_photo_est_proprietaire(name)
  );

-- Rappel (aucune action requise) : l'affichage public d'une photo
-- dans l'app continue de fonctionner car il passe par l'URL publique
-- du bucket (`.storage.from('photos').getPublicUrl(path)`), qui ne
-- consulte pas cette policy. Seule l'énumération via l'API Storage
-- est désormais restreinte au propriétaire réel.

-- ----------------------------------------------------------
-- [3] Grants EXECUTE trop larges (PUBLIC par défaut)
--
-- PostgreSQL accorde EXECUTE à PUBLIC sur toute fonction nouvellement
-- créée, sauf REVOKE explicite. Aucune migration précédente n'avait
-- fait ce REVOKE (y compris claim_nounou_profile, qui avait un GRANT
-- vers `authenticated` mais PAS de REVOKE de PUBLIC -> elle restait
-- exécutable par un rôle anonyme malgré l'intention documentée en
-- 0005). On revoke PUBLIC partout, puis on ré-accorde explicitement
-- uniquement aux rôles qui en ont réellement besoin.
-- ----------------------------------------------------------

-- rechercher_agences : DOIT rester exécutable par un visiteur non
-- connecté (recherche publique côté Ménage) et par un utilisateur
-- connecté.
revoke execute on function rechercher_agences(text, text) from public;
grant execute on function rechercher_agences(text, text) to anon, authenticated;

-- claim_nounou_profile : uniquement un utilisateur authentifié (elle
-- lève de toute façon une exception si auth.uid() est null, mais on
-- ferme aussi la porte au niveau des privilèges, pas seulement au
-- niveau logique).
revoke execute on function claim_nounou_profile() from public;
grant execute on function claim_nounou_profile() to authenticated;

-- assigner_nounou : uniquement les agences connectées (le contrôle
-- fin agence/nounou/disponibilité reste fait à l'intérieur de la
-- fonction, ceci n'est qu'une première barrière).
revoke execute on function assigner_nounou(uuid, uuid) from public;
grant execute on function assigner_nounou(uuid, uuid) to authenticated;

-- menage_visible_via_demande : utilisée uniquement en interne par la
-- policy RLS `menages_select_via_demande`. Un visiteur anonyme n'a de
-- toute façon jamais accès à `menages`, donc pas besoin qu'`anon`
-- puisse l'exécuter.
revoke execute on function menage_visible_via_demande(uuid) from public;
grant execute on function menage_visible_via_demande(uuid) to authenticated;

-- storage_photo_est_proprietaire : utilisée uniquement en interne par
-- les policies Storage (0009/0010), appelée dans le contexte d'un
-- upload/update/select fait par une agence connectée.
revoke execute on function storage_photo_est_proprietaire(text) from public;
grant execute on function storage_photo_est_proprietaire(text) to authenticated;

-- maj_note_moyenne_nounou / maj_note_moyenne_agence : fonctions de
-- trigger PUR (déclenchées automatiquement sur insert dans `avis`).
-- Elles ne doivent JAMAIS être appelables directement via RPC/API
-- (un `select maj_note_moyenne_nounou()` échouerait de toute façon
-- car NEW/OLD n'existent qu'en contexte trigger, mais on ferme quand
-- même les privilèges par défense en profondeur). Le déclenchement
-- via trigger continue de fonctionner : il ne dépend pas d'un GRANT
-- EXECUTE sur le rôle qui fait l'INSERT dans `avis`, seulement des
-- droits du propriétaire de la fonction au moment de la création du
-- trigger.
revoke execute on function maj_note_moyenne_nounou() from public;
revoke execute on function maj_note_moyenne_agence() from public;

-- ============================================================
-- Tests à faire après exécution :
-- 1. Re-lancer le Security Advisor Supabase :
--    - "Function Search Path Mutable" : disparaît pour les 3 fonctions
--    - "Public Bucket Allows Listing" : disparaît pour storage.photos
--    - "Public Can Execute SECURITY DEFINER" : disparaît pour
--      claim_nounou_profile, assigner_nounou, menage_visible_via_demande,
--      storage_photo_est_proprietaire (reste attendu pour
--      rechercher_agences, volontairement public)
-- 2. En anonyme : select rechercher_agences('Cocody');       -> OK
-- 3. En anonyme : select claim_nounou_profile();              -> erreur
--    de privilège (permission denied), plus seulement une exception
--    métier "Utilisateur non authentifié"
-- 4. En anonyme : storage.from('photos').list()                -> vide
--    ou erreur RLS, ne renvoie plus la liste de tous les fichiers
-- 5. Affichage d'une photo existante dans l'app (via photo_url déjà
--    stocké) -> toujours visible (passe par l'URL publique du bucket,
--    pas par la policy select)
-- 6. Ajout d'un avis (insert dans `avis`) en tant que ménage connecté
--    -> note_moyenne de la nounou et de l'agence toujours mises à
--    jour automatiquement (les triggers ne sont pas affectés)
-- ============================================================
