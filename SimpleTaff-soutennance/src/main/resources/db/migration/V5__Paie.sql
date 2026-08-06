CREATE TABLE conge_absence_longue (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    justificatif_url VARCHAR(500),
    affectation_remplacement_id UUID,
    CONSTRAINT fk_conge_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_conge_remplacement FOREIGN KEY (affectation_remplacement_id) REFERENCES affectation(id)
);

CREATE TABLE bulletin_de_paie (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    affectation_id UUID NOT NULL,
    periode VARCHAR(20) NOT NULL,
    jours_prevus INTEGER NOT NULL,
    jours_valides INTEGER NOT NULL,
    jours_absence_justifiee_courte INTEGER NOT NULL DEFAULT 0,
    jours_absence_justifiee_longue INTEGER NOT NULL DEFAULT 0,
    jours_absence_non_justifiee INTEGER NOT NULL DEFAULT 0,
    jours_conge_paye INTEGER NOT NULL DEFAULT 0,
    salaire_brut_effectif DECIMAL(10,2) NOT NULL,
    salaire_net_calcule DECIMAL(10,2) NOT NULL,
    date_cloture TIMESTAMP NOT NULL,
    statut_paiement VARCHAR(50) NOT NULL,
    CONSTRAINT fk_bulletin_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_bulletin_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_bulletin_affectation FOREIGN KEY (affectation_id) REFERENCES affectation(id)
);

CREATE UNIQUE INDEX idx_bulletin_unique ON bulletin_de_paie (affectation_id, periode);
