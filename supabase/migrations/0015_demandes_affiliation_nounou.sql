-- ============================================================
-- 0015_demandes_affiliation_nounou.sql
-- Système de demande d'affiliation : une nounou sans agence peut
-- envoyer une vraie demande (traçable, avec statut) à une agence de
-- sa zone, plutôt qu'un simple contact WhatsApp externe. L'agence
-- peut accepter (-> la nounou est rattachée) ou refuser.
-- À exécuter après 0014_agences_document_verification.sql.
-- ============================================================

-- ----------------------------------------------------------
-- 1. Table
-- ----------------------------------------------------------
create table if not exists demandes_affiliation (
  id uuid primary key default gen_random_uuid(),
  nounou_id uuid not null references nounous(id) on delete cascade,
  agence_id uuid not null references agences(id) on delete cascade,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une nounou ne peut avoir qu'UNE demande active à la fois envers
  -- une même agence (évite le spam de doublons).
  unique (nounou_id, agence_id)
);

comment on table demandes_affiliation is
  'Demande envoyée par une nounou sans agence pour rejoindre le vivier d''une agence.';

create index if not exists idx_demandes_affiliation_agence on demandes_affiliation (agence_id);
create index if not exists idx_demandes_affiliation_nounou on demandes_affiliation (nounou_id);

-- ----------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------
alter table demandes_affiliation enable row level security;

-- La nounou propriétaire de la fiche peut voir ses propres demandes.
create policy "affiliation_select_nounou"
  on demandes_affiliation for select
  using (
    exists (select 1 from nounous n where n.id = nounou_id and n.user_id = auth.uid())
  );

-- L'agence ciblée peut voir les demandes qui lui sont adressées.
create policy "affiliation_select_agence"
  on demandes_affiliation for select
  using (
    exists (select 1 from agences a where a.id = agence_id and a.user_id = auth.uid())
  );

-- La nounou (sans agence) peut créer une demande pour SA propre fiche.
-- On vérifie qu'elle n'a pas déjà d'agence : une nounou déjà affiliée
-- n'a pas à en solliciter une autre depuis cet écran.
create policy "affiliation_insert_nounou"
  on demandes_affiliation for insert
  with check (
    exists (
      select 1 from nounous n
      where n.id = nounou_id
        and n.user_id = auth.uid()
        and n.agence_id is null
    )
  );

-- Pas de policy UPDATE directe : la réponse (accepter/refuser) passe
-- exclusivement par la fonction ci-dessous (SECURITY DEFINER), pour
-- garantir que "accepter" met aussi à jour nounous.agence_id de façon
-- atomique et cohérente.

-- ----------------------------------------------------------
-- 3. Fonction : réponse de l'agence à une demande
-- ----------------------------------------------------------
create or replace function repondre_demande_affiliation(
  p_demande_id uuid,
  p_accepter boolean
)
returns demandes_affiliation
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demande demandes_affiliation;
begin
  -- Doit être l'agence ciblée par la demande, et la demande doit être
  -- encore en attente (pas de double-traitement).
  select d.* into v_demande
  from demandes_affiliation d
  join agences a on a.id = d.agence_id
  where d.id = p_demande_id
    and a.user_id = auth.uid()
    and d.statut = 'en_attente';

  if v_demande is null then
    raise exception 'Demande introuvable, déjà traitée, ou vous n''êtes pas l''agence concernée';
  end if;

  update demandes_affiliation
  set statut = case when p_accepter then 'acceptee' else 'refusee' end,
      updated_at = now()
  where id = p_demande_id
  returning * into v_demande;

  -- Si acceptée : on rattache la nounou à l'agence (seulement si elle
  -- n'a pas déjà été rattachée entre-temps par une autre agence).
  if p_accepter then
    update nounous
    set agence_id = v_demande.agence_id
    where id = v_demande.nounou_id
      and agence_id is null;
  end if;

  return v_demande;
end;
$$;

grant execute on function repondre_demande_affiliation(uuid, boolean) to authenticated;

-- ----------------------------------------------------------
-- Appel depuis le frontend :
--   supabase.rpc('repondre_demande_affiliation', { p_demande_id, p_accepter: true })
-- ============================================================
