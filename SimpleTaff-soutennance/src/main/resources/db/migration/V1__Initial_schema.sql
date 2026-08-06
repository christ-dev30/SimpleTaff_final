CREATE TABLE entreprise (
    id UUID PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    formule_abonnement VARCHAR(50) NOT NULL,
    date_creation TIMESTAMP NOT NULL,
    taux_cotisation DECIMAL(5,2) NOT NULL,
    seuil_absence_longue_jours INTEGER NOT NULL DEFAULT 21,
    taux_retenue_reduite DECIMAL(5,2) NOT NULL DEFAULT 25.00
);

CREATE TABLE utilisateur (
    id UUID PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    entreprise_id UUID,
    statut VARCHAR(50) NOT NULL,
    date_creation TIMESTAMP NOT NULL,
    structure_demandeuse_id UUID,
    CONSTRAINT fk_utilisateur_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);
