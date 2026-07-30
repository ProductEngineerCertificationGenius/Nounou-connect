-- ============================================================
-- 0017_nounous_select_via_demande_affiliation.sql
-- Corrige un trou introduit par 0006_nounou_telephone_privacy.sql
-- combiné à 0015_demandes_affiliation_nounou.sql :
--
-- La policy "nounous_select_owner_or_agence" (0006) n'autorise une
-- agence à lire une fiche `nounous` que si cette nounou lui est déjà
-- rattachée (agence_id = son id). Or, tant qu'une demande
-- d'affiliation (0015) est "en_attente", la nounou n'a justement pas
-- encore d'agence_id (il est NULL) : l'agence ciblée ne pouvait donc
-- pas voir le profil de la nounou qui lui envoie la demande, et
-- l'embed `nounou:nounous(...)` de useDemandesAffiliationAgence()
-- renvoyait `null` ("Profil indisponible" côté front).
--
-- À exécuter après 0016_nounou_self_register_experience.sql.
-- ============================================================

create policy "nounous_select_via_demande_affiliation"
  on nounous for select
  using (
    exists (
      select 1
      from demandes_affiliation d
      join agences a on a.id = d.agence_id
      where d.nounou_id = nounous.id
        and a.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------
-- Test à faire après exécution :
-- 1. Connecté comme l'agence ciblée par une demande "en_attente" :
--    select * from nounous where id = '<nounou_id_de_la_demande>';
--    -> la ligne doit être visible (avant : 0 ligne).
-- 2. Connecté comme une AUTRE agence (qui n'a reçu aucune demande de
--    cette nounou) : la même requête doit renvoyer 0 ligne (RLS
--    toujours étanche entre agences non concernées).
-- ============================================================
