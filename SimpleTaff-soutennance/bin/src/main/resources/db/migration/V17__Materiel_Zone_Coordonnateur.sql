-- V17: Add zone and coordonnateur assignment to materiel
ALTER TABLE materiel ADD zone_id UUID;
ALTER TABLE materiel ADD coordonnateur_id UUID;

ALTER TABLE materiel ADD CONSTRAINT fk_materiel_zone FOREIGN KEY (zone_id) REFERENCES zone(id);
ALTER TABLE materiel ADD CONSTRAINT fk_materiel_coordonnateur FOREIGN KEY (coordonnateur_id) REFERENCES utilisateur(id);
