-- ============================================================
-- 0016_nounou_self_register_experience.sql
-- Corrige nounou_self_register() : le paramètre p_experience
-- n'existait pas, la fonction insérait systématiquement la valeur
-- fixe 'Non renseigné' quelle que soit la saisie du formulaire
-- (cf. InscriptionPage.tsx, champ "experience" jusqu'ici non transmis).
-- À exécuter après 0015_demandes_affiliation_nounou.sql
-- ============================================================

create or replace function nounou_self_register(
  p_phone text,
  p_nom text,
  p_quartier text,
  p_ethnie text default null,
  p_experience text default null
)
returns nounous
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row nounous;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Vous devez être authentifié pour vous inscrire.';
  end if;

  -- Idempotent : si un profil existe déjà pour cet utilisateur, on le
  -- renvoie tel quel plutôt que d'échouer (reconnexions suivantes).
  select * into v_row from nounous where user_id = v_user_id;
  if found then
    return v_row;
  end if;

  insert into nounous (
    user_id,
    nom,
    telephone,
    quartier,
    ethnie,
    experience,
    langues,
    tarif,
    disponible,
    agence_id,
    created_at
  ) values (
    v_user_id,
    p_nom,
    p_phone,
    p_quartier,
    p_ethnie,
    coalesce(nullif(trim(p_experience), ''), 'Non renseigné'),
    array[]::text[],
    0,
    true,
    null,
    now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- L'ancienne signature à 4 arguments (sans p_experience) doit être
-- retirée : sinon PostgreSQL garde les deux fonctions en surcharge et
-- le frontend (qui n'enverra plus que la nouvelle forme) continuerait
-- de fonctionner, mais on nettoie pour éviter toute confusion/dérive.
drop function if exists nounou_self_register(text, text, text, text);

grant execute on function nounou_self_register(text, text, text, text, text) to authenticated;
