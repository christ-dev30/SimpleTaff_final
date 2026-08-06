CREATE TABLE facture (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    structure_demandeuse_id UUID NOT NULL,
    periode VARCHAR(20) NOT NULL,
    montant_facture DECIMAL(10,2) NOT NULL,
    rapport_pointage_url VARCHAR(500) NOT NULL,
    statut_paiement VARCHAR(50) NOT NULL,
    date_emission TIMESTAMP NOT NULL,
    mode_paiement VARCHAR(50) NOT NULL DEFAULT 'VIREMENT_BANCAIRE',
    CONSTRAINT fk_facture_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_facture_structure FOREIGN KEY (structure_demandeuse_id) REFERENCES structure_demandeuse(id)
);

CREATE TABLE facture_affectation (
    facture_id UUID NOT NULL,
    affectation_id UUID NOT NULL,
    PRIMARY KEY (facture_id, affectation_id),
    CONSTRAINT fk_fa_facture FOREIGN KEY (facture_id) REFERENCES facture(id),
    CONSTRAINT fk_fa_affectation FOREIGN KEY (affectation_id) REFERENCES affectation(id)
);
