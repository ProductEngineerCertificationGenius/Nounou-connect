-- ============================================================
-- 0020_relance_avis_j7.sql
-- Prépare la fonctionnalité : "7 jours après qu'une agence a
-- confirmé l'assignation d'une nounou à une famille, on rappelle à
-- la famille de laisser un avis (étoiles + commentaire) sur cette
-- nounou".
--
-- Deux ajouts nécessaires :
--
-- 1. `demandes.date_assignation` : la colonne `demandes.date` existe
--    déjà mais correspond à la date de CRÉATION de la demande, pas à
--    la date à laquelle l'agence a confirmé l'assignation (ce qui
--    peut être bien plus tard). Sans cette colonne, impossible de
--    calculer un vrai "J+7 depuis l'assignation".
--
-- 2. `avis.demande_id` : la table `avis` (0001_schema.sql) n'est
--    liée qu'à `nounou_id` + `menage_id`. Si une même famille reprend
--    la même nounou une seconde fois plus tard, il faut pouvoir
--    distinguer "cette famille a déjà noté CETTE mise en relation"
--    de "cette famille a déjà noté cette nounou (une fois, il y a
--    longtemps, pour un autre séjour)" — sinon la relance ne se
--    redéclencherait jamais pour un 2e séjour avec la même nounou.
-- ============================================================

alter table demandes add column if not exists date_assignation timestamptz;
alter table avis     add column if not exists demande_id uuid references demandes (id) on delete set null;

create index if not exists idx_avis_demande on avis (demande_id);

-- ----------------------------------------------------------
-- Met à jour assigner_nounou() (0003_functions.sql) pour dater
-- l'assignation au moment où elle se produit réellement.
-- ----------------------------------------------------------
create or replace function assigner_nounou(
  p_demande_id uuid,
  p_nounou_id  uuid
)
returns demandes
language plpgsql
as $$
declare
  v_demande demandes;
begin
  update demandes
  set statut = 'Assignée',
      nounou_assignee_id = p_nounou_id,
      date_assignation = now()
  where id = p_demande_id
    and agence_id = (select agence_id from nounous where id = p_nounou_id)
    and exists (
      select 1 from nounous
      where id = p_nounou_id and disponible = true
    )
  returning * into v_demande;

  if v_demande is null then
    raise exception 'Assignation impossible : nounou indisponible ou agence différente';
  end if;

  return v_demande;
end;
$$;

-- Aucune policy RLS supplémentaire nécessaire : `avis_insert_menage`
-- (0002_rls.sql) autorise déjà un ménage à insérer un avis pour
-- n'importe quelle nounou, avec ou sans demande_id.

-- ============================================================
-- Fin 0020_relance_avis_j7.sql
-- ============================================================
