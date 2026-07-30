-- ============================================================
-- 0026_demandes_affiliation_annulation.sql
-- Corrige deux bugs constatés sur les demandes d'affiliation
-- (nounou -> agence, cf. 0015_demandes_affiliation_nounou.sql) :
--
-- 1. « La demande part avant le timeout » : contrairement à
--    `demandes` (ménage -> nounou, cf. 0024_demandes_annulation_1min.sql),
--    la policy SELECT de `demandes_affiliation` pour l'agence n'a
--    jamais eu de délai de grâce. L'agence voyait donc la demande
--    dès son envoi, avant même la fin de la minute pendant laquelle
--    la nounou est censée pouvoir encore l'annuler tranquillement.
--
-- 2. « L'annulation ne fait rien, la demande reste affichée » :
--    RLS est activé sur `demandes_affiliation` mais AUCUNE policy
--    DELETE n'a jamais été créée. Le `.delete()` envoyé par
--    useAnnulerDemandeAffiliation() (src/hooks/useAffiliation.ts)
--    était donc systématiquement bloqué par la base (0 ligne
--    supprimée, sans erreur SQL), ce qui déclenchait le message
--    "Impossible d'annuler cette demande (délai dépassé ou accès
--    refusé par la base)" tout en laissant la demande intacte.
--
-- À exécuter après 0025_demandes_refus_agence.sql.
-- ============================================================

-- ----------------------------------------------------------
-- [1] SELECT agence : même délai de grâce d'1 minute que sur
-- `demandes`. Une fois traitée (acceptee/refusee), la demande reste
-- visible sans condition de délai (utile pour l'historique de
-- l'agence).
-- ----------------------------------------------------------
drop policy if exists "affiliation_select_agence" on demandes_affiliation;
create policy "affiliation_select_agence"
  on demandes_affiliation for select
  using (
    exists (select 1 from agences a where a.id = agence_id and a.user_id = auth.uid())
    and (statut <> 'en_attente' or created_at <= now() - interval '1 minute')
  );

-- ----------------------------------------------------------
-- [2] DELETE nounou : policy manquante depuis la création de la
-- table. La nounou ne peut supprimer que SA propre demande, tant
-- qu'elle est encore "en_attente" et dans la minute suivant sa
-- création — même règle que celle déjà vérifiée côté client dans
-- useAnnulerDemandeAffiliation(), désormais appliquée aussi côté
-- base (un client malveillant ne pourrait pas annuler après coup).
-- ----------------------------------------------------------
drop policy if exists "affiliation_delete_nounou" on demandes_affiliation;
create policy "affiliation_delete_nounou"
  on demandes_affiliation for delete
  using (
    exists (select 1 from nounous n where n.id = nounou_id and n.user_id = auth.uid())
    and statut = 'en_attente'
    and created_at > now() - interval '1 minute'
  );

-- ============================================================
-- Fin 0026_demandes_affiliation_annulation.sql
-- Tests à faire après exécution :
-- 1. Une nounou sans agence envoie une demande d'affiliation ->
--    l'agence ciblée ne la voit PAS encore dans son dashboard
--    (select sur demandes_affiliation côté agence).
-- 2. La nounou annule dans la minute -> la ligne est bien supprimée
--    (delete réussi, la demande disparaît de "Mes demandes envoyées").
-- 3. Après la minute écoulée, la nounou ne peut plus annuler (delete
--    bloqué par la policy) et l'agence voit désormais la demande.
-- ============================================================
