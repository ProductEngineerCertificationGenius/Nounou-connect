-- ============================================================
-- 0004_storage.sql
-- Rôle 4 — Stockage des photos (nounous et agences)
-- À exécuter après 0003_functions.sql.
-- ============================================================

-- Créer le bucket (peut aussi être fait depuis l'onglet Storage
-- de l'interface Supabase, plus simple visuellement) :
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- Lecture publique des photos (nécessaire pour les afficher dans
-- l'app sans authentification)
-- ----------------------------------------------------------
create policy "photos_lecture_publique"
  on storage.objects for select
  using (bucket_id = 'photos');

-- ----------------------------------------------------------
-- Upload réservé aux utilisateurs connectés, dans un dossier
-- correspondant à leur propre id (convention : {user_id}/xxx.jpg)
-- ----------------------------------------------------------
create policy "photos_upload_utilisateur_connecte"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "photos_maj_utilisateur_connecte"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Convention d'upload côté frontend :
-- supabase.storage.from('photos').upload(`${user.id}/nounou-${nounouId}.jpg`, file)
-- puis stocker l'URL publique obtenue dans nounous.photo_url / agences.photo_url

-- ============================================================
-- Fin 0004_storage.sql
-- ============================================================
