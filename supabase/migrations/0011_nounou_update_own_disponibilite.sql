-- ----------------------------------------------------------
-- Correctif : la nounou ne peut pas se marquer disponible /
-- indisponible depuis son propre espace.
--
-- Cause : la seule policy UPDATE sur `nounous`
-- (`nounous_update_own_agence`) n'autorise que l'agence
-- propriétaire à modifier la fiche. La nounou, connectée avec
-- son propre compte (`nounous.user_id = auth.uid()`), n'a
-- aucune policy qui la couvre. Le bouton "Marquer indisponible"
-- déclenche bien l'UPDATE, mais RLS filtre la ligne : 0 ligne
-- modifiée, aucune erreur renvoyée -> l'écran ne bouge pas.
--
-- Correctif : nouvelle policy dédiée, qui autorise la nounou à
-- modifier sa propre ligne (même logique que
-- `nounous_update_own_agence`, mais côté nounou plutôt que côté
-- agence). RLS ne fait pas de contrôle colonne par colonne : la
-- restriction "seul `disponible` doit changer" reste portée par
-- le client (seul ce champ est envoyé dans l'UPDATE de
-- `EspaceNounou.tsx`). Si on veut un jour la verrouiller
-- côté base, il faudra un trigger BEFORE UPDATE dédié plutôt
-- qu'une policy RLS.
-- ----------------------------------------------------------

create policy "nounous_update_own_self"
  on nounous for update
  using (
    user_id = auth.uid()
  )
  with check (
    user_id = auth.uid()
  );
