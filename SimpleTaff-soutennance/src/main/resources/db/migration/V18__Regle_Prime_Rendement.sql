CREATE TABLE regle_prime_rendement (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    montant_par_point DECIMAL(10,2) NOT NULL,
    seuil_minimum INT NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF',
    CONSTRAINT fk_regle_prime_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);
