CREATE TABLE carte_agent (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    code_qr TEXT NOT NULL,
    statut VARCHAR(50) NOT NULL,
    date_emission TIMESTAMP NOT NULL,
    CONSTRAINT fk_carte_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

-- Un agent ne peut avoir qu'une seule carte ACTIVE à la fois
CREATE UNIQUE INDEX idx_agent_carte_active ON carte_agent (agent_id) WHERE statut = 'ACTIVE';

CREATE TABLE pointage (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    affectation_id UUID NOT NULL,
    carte_scannee_id UUID NOT NULL,
    date_heure_entree TIMESTAMP NOT NULL,
    date_heure_sortie TIMESTAMP,
    valide_par_employeur_id UUID,
    date_validation TIMESTAMP,
    statut VARCHAR(50) NOT NULL,
    CONSTRAINT fk_pointage_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_pointage_affectation FOREIGN KEY (affectation_id) REFERENCES affectation(id),
    CONSTRAINT fk_pointage_carte FOREIGN KEY (carte_scannee_id) REFERENCES carte_agent(id),
    CONSTRAINT fk_pointage_employeur FOREIGN KEY (valide_par_employeur_id) REFERENCES utilisateur(id)
);

-- Un seul pointage non terminé (sortie NULL) par affectation
CREATE UNIQUE INDEX idx_pointage_en_cours ON pointage (affectation_id) WHERE date_heure_sortie IS NULL;
