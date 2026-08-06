CREATE TABLE poste (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    site_id UUID NOT NULL,
    emploi_id UUID NOT NULL,
    categorie_appliquee VARCHAR(100),
    salaire_brut_negocie DECIMAL(10,2) NOT NULL,
    montant_retenue_forfaitaire DECIMAL(10,2) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    CONSTRAINT fk_poste_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_poste_site FOREIGN KEY (site_id) REFERENCES site(id),
    CONSTRAINT fk_poste_emploi FOREIGN KEY (emploi_id) REFERENCES emploi(id)
);

CREATE TABLE affectation (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    poste_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    date_debut_occupation DATE NOT NULL,
    date_fin_occupation DATE,
    motif_fin VARCHAR(100),
    statut VARCHAR(50) NOT NULL,
    CONSTRAINT fk_affectation_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_affectation_poste FOREIGN KEY (poste_id) REFERENCES poste(id),
    CONSTRAINT fk_affectation_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

-- Contrainte critique : Un agent ne peut avoir qu'une seule affectation ACTIVE à la fois
CREATE UNIQUE INDEX idx_agent_affectation_active ON affectation (agent_id) WHERE statut = 'ACTIVE';
