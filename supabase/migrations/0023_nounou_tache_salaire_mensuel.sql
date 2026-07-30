-- ============================================================
-- 0023_nounou_tache_salaire_mensuel.sql
-- Deux corrections demandées :
--
-- [1] La fiche nounou n'avait aucune colonne pour la tâche que la
--     nounou effectue (garde d'enfants, aide ménagère, cuisine...).
--     Or c'est l'agence qui doit renseigner cette information à la
--     création/modification d'une nounou dans son vivier
--     (GestionNounous.tsx). On ajoute la colonne `tache`, exposée
--     dans `nounous_public` pour que les familles la voient, et on
--     branche enfin le paramètre `p_besoin` de `rechercher_nounous`
--     (accepté depuis 0018 mais jamais utilisé comme filtre, faute
--     de colonne correspondante) pour filtrer dessus.
--
-- [2] `tarif` était affiché un peu partout comme "FCFA / jour"
--     (GestionNounous.tsx, EspaceNounou.tsx, EspaceMenage.tsx,
--     RechercheNounou.tsx) alors qu'il s'agit en réalité d'un
--     salaire MENSUEL (les valeurs de démo, ex. 40000-70000 FCFA,
--     n'ont de sens qu'au mois). La colonne elle-même ne change pas
--     (c'est un entier, pas d'unité stockée) : seul l'affichage
--     frontend est corrigé, dans ce même lot de modifications.
--
-- À exécuter après 0022_rechercher_nounous_avec_agence.sql.
-- ============================================================

-- ----------------------------------------------------------
-- [1a] Nouvelle colonne. Nullable : une nounou existante n'a pas
-- encore de tâche renseignée tant que l'agence ne l'a pas éditée ;
-- une nounou auto-inscrite (nounou_self_register, 0012) n'en a pas
-- non plus tant qu'elle n'est pas affiliée/éditée par une agence.
-- ----------------------------------------------------------
alter table nounous add column if not exists tache text;

alter table nounous drop constraint if exists nounous_tache_check;
alter table nounous add constraint nounous_tache_check
  check (tache is null or tache in (
    'Garde d''enfants',
    'Aide ménagère',
    'Mixte (Garde + Ménage)'
  ));

-- ----------------------------------------------------------
-- [1b] Vue publique : ajoute `tache` (redéfinition complète, sur le
-- même modèle que 0007_calibrage_affichage.sql).
-- ----------------------------------------------------------
create or replace view nounous_public as
select
  id, agence_id, nom, experience, langues, tarif, quartier, tache,
  photo_url, disponible, note_moyenne, created_at,
  note_moyenne as note
from nounous;

grant select on nounous_public to anon, authenticated;

-- ----------------------------------------------------------
-- [1c] La RPC de recherche filtre désormais réellement sur la tâche
-- recherchée par la famille, quand elle en a précisé une.
-- ----------------------------------------------------------
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
    and (p_besoin is null or np.tache = p_besoin)
  order by np.note_moyenne desc nulls last;
$$;

grant execute on function rechercher_nounous(text, text) to anon, authenticated;

-- ============================================================
-- Fin 0023_nounou_tache_salaire_mensuel.sql
-- Note : le point [2] (libellés "/ mois" au lieu de "/ jour") est un
-- changement purement frontend, appliqué dans le même lot sur
-- GestionNounous.tsx, EspaceNounou.tsx, EspaceMenage.tsx et
-- RechercheNounou.tsx.
-- ============================================================
