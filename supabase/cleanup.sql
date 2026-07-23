-- ============================================================
-- cleanup.sql
-- Supprime toutes les données utilisateur pour recommencer
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- TRUNCATE les tables de profils (suit l'ordre inverse des dépendances)
TRUNCATE TABLE demandes CASCADE;
TRUNCATE TABLE avis CASCADE;
TRUNCATE TABLE recherches CASCADE;
TRUNCATE TABLE nounous CASCADE;
TRUNCATE TABLE agences CASCADE;
TRUNCATE TABLE menages CASCADE;

-- Supprimer tous les utilisateurs Auth
-- ⚠️ ATTENTION : ceci supprime TOUS les comptes utilisateurs !
DELETE FROM auth.users;

SELECT 'Nettoyage complet terminé !' as message;
