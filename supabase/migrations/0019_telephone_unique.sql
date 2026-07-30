-- ============================================================
-- 0019_telephone_unique.sql
-- Empêche un même numéro de téléphone de créer plusieurs comptes
-- sur une même table (menage, agence, nounou).
-- ============================================================

alter table menages
  add constraint menages_telephone_unique unique (telephone);

alter table agences
  add constraint agences_telephone_unique unique (telephone);

alter table nounous
  add constraint nounous_telephone_unique unique (telephone);