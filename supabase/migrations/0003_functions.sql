-- ============================================================
-- 0003_functions.sql
-- Rôle 3 (Ménage) + Rôle 4 (Agence/Nounou)
-- À exécuter après 0002_rls.sql.
-- ============================================================

-- ----------------------------------------------------------
-- [Rôle 3] Recherche d'agences correspondant aux critères du
-- ménage : renvoie les agences ayant au moins une nounou
-- disponible correspondant au quartier + besoin recherchés.
-- Remplace le simple filtre par quartier utilisé en mock.
-- ----------------------------------------------------------
create or replace function rechercher_agences(
  p_quartier text,
  p_besoin   text default null
)
returns setof agences
language sql
stable
as $$
  select distinct a.*
  from agences a
  join nounous n on n.agence_id = a.id
  where n.disponible = true
    and n.quartier = p_quartier
    -- Le mock actuel ne modélise pas le champ "besoin" côté nounou :
    -- si vous ajoutez une colonne `specialite` sur `nounous`, décommenter :
    -- and (p_besoin is null or n.specialite = p_besoin)
  order by a.note_moyenne desc;
$$;

-- Appel depuis le frontend (Supabase JS) :
-- supabase.rpc('rechercher_agences', { p_quartier: 'Cocody', p_besoin: null })

-- ----------------------------------------------------------
-- [Rôle 3] Mise à jour automatique de la note moyenne d'une
-- nounou à chaque nouvel avis inséré.
-- ----------------------------------------------------------
create or replace function maj_note_moyenne_nounou()
returns trigger
language plpgsql
as $$
begin
  update nounous
  set note_moyenne = (
    select round(avg(note)::numeric, 1)
    from avis
    where nounou_id = new.nounou_id
  )
  where id = new.nounou_id;
  return new;
end;
$$;

create trigger trg_maj_note_moyenne_nounou
  after insert on avis
  for each row
  execute function maj_note_moyenne_nounou();

-- ----------------------------------------------------------
-- [Rôle 4] Mise à jour automatique de la note moyenne d'une
-- agence à partir des avis de toutes ses nounous.
-- ----------------------------------------------------------
create or replace function maj_note_moyenne_agence()
returns trigger
language plpgsql
as $$
begin
  update agences
  set note_moyenne = (
    select round(avg(a.note)::numeric, 1)
    from avis a
    join nounous n on n.id = a.nounou_id
    where n.agence_id = (select agence_id from nounous where id = new.nounou_id)
  )
  where id = (select agence_id from nounous where id = new.nounou_id);
  return new;
end;
$$;

create trigger trg_maj_note_moyenne_agence
  after insert on avis
  for each row
  execute function maj_note_moyenne_agence();

-- ----------------------------------------------------------
-- [Rôle 4] Statistiques du tableau de bord agence
-- (nb nounous, nb demandes, nb placements réalisés)
-- ----------------------------------------------------------
create or replace view agence_stats as
select
  a.id as agence_id,
  count(distinct n.id) as nb_nounous,
  count(distinct d.id) as nb_demandes,
  count(distinct d.id) filter (where d.statut = 'Assignée') as nb_placements
from agences a
left join nounous n on n.agence_id = a.id
left join demandes d on d.agence_id = a.id
group by a.id;

-- Appel depuis le frontend :
-- supabase.from('agence_stats').select('*').eq('agence_id', agenceId).single()

-- ----------------------------------------------------------
-- [Rôle 4] Assignation d'une nounou à une demande.
-- Fonction plutôt qu'un simple update direct : garantit qu'on ne
-- peut assigner qu'une nounou disponible et appartenant à la même
-- agence que la demande.
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
      nounou_assignee_id = p_nounou_id
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

-- Appel depuis le frontend :
-- supabase.rpc('assigner_nounou', { p_demande_id: demandeId, p_nounou_id: nounouId })

-- ============================================================
-- Fin 0003_functions.sql
-- ============================================================
