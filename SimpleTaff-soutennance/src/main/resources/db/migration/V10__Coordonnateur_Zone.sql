-- V10__Coordonnateur_Zone.sql
-- Ajout de la relation entre coordonnateur (utilisateur) et zone géographique
ALTER TABLE utilisateur ADD COLUMN zone_id UUID;
ALTER TABLE utilisateur ADD CONSTRAINT fk_utilisateur_zone FOREIGN KEY (zone_id) REFERENCES zone(id) ON DELETE SET NULL;
