-- ============================================================
-- 0025_demandes_refus_agence.sql
-- Ajoute la possibilité pour l'agence de refuser une demande
-- "En attente" (bouton "Refuser" dans DemandesAgence.tsx).
--
-- Aucun changement de policy nécessaire côté RLS : l'agence peut
-- déjà modifier n'importe quelle demande lui appartenant via la
-- policy "demandes_update_agence" (0002_rls.sql), qui ne restreint
-- pas les valeurs autorisées pour `statut`. Seule la contrainte de
-- validité de la colonne doit être élargie.
--
-- À exécuter après 0024_demandes_annulation_1min.sql.
-- ============================================================

alter table demandes drop constraint if exists demandes_statut_check;
alter table demandes add constraint demandes_statut_check
  check (statut in ('En attente', 'Assignée', 'Annulée', 'Refusée'));

-- ============================================================
-- Fin 0025_demandes_refus_agence.sql
-- Test à faire après exécution :
-- 1. En tant qu'agence connectée :
--    update demandes set statut = 'Refusée' where id = '<id>';
--    -> doit réussir pour une demande de statut 'En attente'
--       appartenant à cette agence.
-- ============================================================
