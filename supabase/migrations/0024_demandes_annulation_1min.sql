-- ============================================================
-- 0024_demandes_annulation_1min.sql
-- Ajoute la possibilité pour une famille d'annuler sa demande dans
-- la minute qui suit son envoi (bouton rouge + décompte, cf.
-- RechercheNounou.tsx). Tant que la minute n'est pas écoulée,
-- l'agence ne voit pas encore la demande dans son dashboard.
--
-- Le compte à rebours affiché côté famille est purement visuel :
-- la vraie règle est appliquée ici, côté base de données, via RLS.
-- Un ménage malveillant qui bricolerait le frontend ne pourrait ni
-- annuler après la minute, ni faire apparaître sa demande à
-- l'agence plus tôt que prévu.
--
-- À exécuter après 0023_nounou_tache_salaire_mensuel.sql.
-- ============================================================

-- ----------------------------------------------------------
-- [1] Nouveau statut possible : 'Annulée'.
-- ----------------------------------------------------------
alter table demandes drop constraint if exists demandes_statut_check;
alter table demandes add constraint demandes_statut_check
  check (statut in ('En attente', 'Assignée', 'Annulée'));

-- ----------------------------------------------------------
-- [2] L'agence ne voit une demande que si :
--     - elle n'a pas été annulée, ET
--     - au moins 1 minute s'est écoulée depuis sa création (`date`).
-- Le ménage, lui, voit toujours ses propres demandes (y compris
-- pendant la minute de grâce, pour afficher le décompte + le
-- bouton d'annulation, et après annulation, à titre d'historique).
-- ----------------------------------------------------------
drop policy if exists "demandes_select_agence_ou_menage" on demandes;
create policy "demandes_select_agence_ou_menage"
  on demandes for select
  using (
    (
      agence_id in (select id from agences where user_id = auth.uid())
      and statut <> 'Annulée'
      and date <= now() - interval '1 minute'
    )
    or menage_id in (select id from menages where user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- [3] Le ménage peut annuler SA demande, mais seulement :
--     - tant qu'elle est encore 'En attente' (pas déjà traitée), ET
--     - dans la minute qui suit sa création.
-- Le `with check` verrouille la transition : seul un passage vers
-- 'Annulée' est autorisé par cette policy (pas de modification des
-- autres champs, pas de "dé-annulation").
-- ----------------------------------------------------------
drop policy if exists "demandes_update_menage_annulation" on demandes;
create policy "demandes_update_menage_annulation"
  on demandes for update
  using (
    menage_id in (select id from menages where user_id = auth.uid())
    and statut = 'En attente'
    and date > now() - interval '1 minute'
  )
  with check (
    menage_id in (select id from menages where user_id = auth.uid())
    and statut = 'Annulée'
  );

-- ============================================================
-- Fin 0024_demandes_annulation_1min.sql
-- Test à faire après exécution :
-- 1. Une famille envoie une demande -> l'agence ne la voit pas
--    encore dans son dashboard (select sur `demandes`).
-- 2. La famille annule dans la minute -> statut passe à 'Annulée',
--    l'agence ne la verra jamais.
-- 3. Si la famille laisse passer la minute sans annuler -> la
--    demande apparaît chez l'agence, et l'annulation n'est plus
--    possible (l'update est rejeté par la policy).
-- ============================================================
