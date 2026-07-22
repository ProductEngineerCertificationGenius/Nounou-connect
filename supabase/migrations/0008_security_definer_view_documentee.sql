-- ============================================================
-- 0008_security_definer_view_documentee.sql
-- Réponse aux 2 alertes du Security Advisor Supabase :
--   - Security Definer View : public.agences_public
--   - Security Definer View : public.nounous_public
-- À exécuter après 0007_calibrage_affichage.sql.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS
-- -----------------------------------
-- Elle ne met PAS security_invoker = true sur ces deux vues.
-- Ce serait la correction réflexe face à l'alerte, mais elle
-- casserait les deux vues pour tout visiteur anonyme :
--
--   - nounous_public : sans security_invoker, la vue tourne avec
--     les droits de son propriétaire et ignore la policy stricte
--     posée dans 0006 sur `nounous` (nounous_select_owner_or_agence,
--     qui exige auth.uid() = agence propriétaire ou nounou elle-même).
--     Avec security_invoker = true, un visiteur anonyme se ferait
--     appliquer cette policy À TRAVERS la vue -> 0 ligne renvoyée ->
--     recherche Ménage cassée.
--
--   - agences_public : même mécanisme sur sa jointure interne vers
--     `nounous` (pour nbNounous) et `avis` (pour nbAvis). `agences`
--     et `avis` sont déjà en lecture publique (policies
--     agences_select_public / avis_select_public, using (true)),
--     mais `nounous` ne l'est pas. Avec security_invoker = true, le
--     left join vers nounous ne renverrait jamais rien pour un
--     anonyme -> nbNounous toujours à 0.
--
-- Ces deux vues existent précisément pour contourner, de façon
-- contrôlée, le RLS restrictif de `nounous` afin de n'exposer que
-- des colonnes non sensibles (jamais `telephone` pour une nounou) ou
-- des agrégats (comptes). C'est le modèle "vue = façade de colonnes
-- publiques" standard en Postgres, pas un oubli de sécurisation.
--
-- CE QU'ELLE FAIT
-- -----------------------------------
-- 1. Fixe explicitement l'option (au lieu de laisser le défaut
--    implicite), pour que l'intention soit lisible dans le schéma
--    et ne soit pas "corrigée" par erreur plus tard.
-- 2. Documente la raison via COMMENT ON VIEW, visible dans
--    l'éditeur SQL Supabase et dans tout outil d'introspection.
-- 3. Verrouille les GRANT pour qu'ils ne portent que sur les
--    colonnes réellement voulues (rappel défensif, déjà correct
--    depuis 0006/0007, mais réaffirmé ici en un seul endroit).
-- ============================================================

alter view nounous_public set (security_invoker = false);
alter view agences_public set (security_invoker = false);

comment on view nounous_public is
  'Vue publique intentionnellement SECURITY DEFINER (security_invoker=false). '
  'Contourne volontairement la policy RLS restrictive de `nounous` '
  '(nounous_select_owner_or_agence) pour exposer aux anonymes/menages un '
  'sous-ensemble de colonnes non sensibles (jamais `telephone`, cf. '
  '0006_nounou_telephone_privacy.sql). Alerte "Security Definer View" du '
  'Security Advisor attendue et acceptée pour cette vue précise — ne pas '
  'passer en security_invoker=true, cela viderait la vue pour tout '
  'utilisateur anonyme.';

comment on view agences_public is
  'Vue publique intentionnellement SECURITY DEFINER (security_invoker=false). '
  'Agrège nbNounous/nbAvis via des jointures vers `nounous` (RLS restrictif) '
  'et `avis` (public). Alerte "Security Definer View" du Security Advisor '
  'attendue et acceptée pour cette vue précise — ne pas passer en '
  'security_invoker=true, cela ramènerait nbNounous à 0 pour tout '
  'utilisateur anonyme.';

-- Réaffirmation défensive des GRANT (déjà posés en 0006/0007) :
-- seules ces deux vues sont exposées aux rôles publics, jamais les
-- tables `nounous` / `agences` / `avis` directement pour un anonyme
-- sur les colonnes sensibles.
grant select on nounous_public to anon, authenticated;
grant select on agences_public to anon, authenticated;

-- ============================================================
-- Tests à faire après exécution :
-- 1. select security_invoker from pg_views ... (ou \d+ nounous_public
--    dans psql) -> option bien à false, présente explicitement
-- 2. Re-lancer le Security Advisor Supabase : les 2 alertes restent
--    visibles (comportement attendu, pas une régression) mais sont
--    maintenant documentées dans le schéma lui-même
-- 3. select * from nounous_public; en anonyme -> toujours des lignes,
--    pas de colonne telephone
-- 4. select * from agences_public; en anonyme -> nbNounous/nbAvis
--    toujours correctement peuplés (pas de régression à 0)
-- ============================================================
