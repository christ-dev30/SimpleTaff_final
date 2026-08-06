CREATE TABLE zone (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    perimetre VARCHAR(255),
    statut VARCHAR(50) NOT NULL,
    CONSTRAINT fk_zone_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE emploi (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    categorie VARCHAR(100),
    competences_requises TEXT,
    salaire_brut_reference DECIMAL(10,2),
    CONSTRAINT fk_emploi_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE agent_terrain (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    zone_id UUID NOT NULL,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    CONSTRAINT fk_agent_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_agent_zone FOREIGN KEY (zone_id) REFERENCES zone(id)
);

CREATE TABLE agent_emploi (
    agent_id UUID NOT NULL,
    emploi_id UUID NOT NULL,
    PRIMARY KEY (agent_id, emploi_id),
    CONSTRAINT fk_ae_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_ae_emploi FOREIGN KEY (emploi_id) REFERENCES emploi(id)
);

CREATE TABLE piece_justificative (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    date_expiration DATE,
    url_document VARCHAR(500) NOT NULL,
    CONSTRAINT fk_piece_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

CREATE TABLE structure_demandeuse (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    raison_sociale VARCHAR(255) NOT NULL,
    secteur VARCHAR(100),
    besoins_recurrents BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_structure_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE site (
    id UUID PRIMARY KEY,
    structure_demandeuse_id UUID NOT NULL,
    zone_id UUID NOT NULL,
    nom VARCHAR(255) NOT NULL,
    adresse TEXT,
    CONSTRAINT fk_site_structure FOREIGN KEY (structure_demandeuse_id) REFERENCES structure_demandeuse(id),
    CONSTRAINT fk_site_zone FOREIGN KEY (zone_id) REFERENCES zone(id)
);

ALTER TABLE utilisateur ADD CONSTRAINT fk_util_structure FOREIGN KEY (structure_demandeuse_id) REFERENCES structure_demandeuse(id);

CREATE TABLE employeur_site (
    employeur_id UUID NOT NULL,
    site_id UUID NOT NULL,
    PRIMARY KEY (employeur_id, site_id),
    CONSTRAINT fk_es_employeur FOREIGN KEY (employeur_id) REFERENCES utilisateur(id),
    CONSTRAINT fk_es_site FOREIGN KEY (site_id) REFERENCES site(id)
);
