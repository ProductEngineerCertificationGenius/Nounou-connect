-- ============================================================
-- 0022_rechercher_nounous_avec_agence.sql
-- Corrige un bug de 0018_rechercher_nounous.sql : la fonction ne
-- filtrait pas les nounous SANS agence (agence_id null, cf.
-- auto-inscription 0012_nounou_self_insert.sql). Ces nounous
-- apparaissaient donc dans les résultats de recherche d'une famille
-- au même titre que les autres.
--
-- Conséquence concrète : si une famille choisissait une de ces
-- nounous "sans agence" et cliquait sur "Choisir cette nounou",
-- l'insertion dans `demandes` échouait silencieusement, car
-- `demandes.agence_id` est NOT NULL (0001_schema.sql) — la demande
-- n'était donc jamais créée, et n'apparaissait nulle part côté
-- agence (ce qui pouvait ressembler à "la demande a disparu").
--
-- Une nounou sans agence doit d'abord être affiliée à une agence
-- (cf. 0015_demandes_affiliation_nounou.sql / 0017) avant de pouvoir
-- apparaître dans les résultats de recherche des familles.
--
-- À exécuter après 0021_photo_menage.sql.
-- ============================================================

create or replace function rechercher_nounous(
  p_quartier text,
  p_besoin   text default null
)
returns setof nounous_public
language sql
stable
security definer
set search_path = public
as $$
  select np.*
  from nounous_public np
  where np.disponible = true
    and np.quartier = p_quartier
    and np.agence_id is not null
  order by np.note_moyenne desc nulls last;
$$;

-- ============================================================
-- Fin 0022_rechercher_nounous_avec_agence.sql
-- ============================================================
