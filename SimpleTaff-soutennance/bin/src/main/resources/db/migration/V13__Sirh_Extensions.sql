ALTER TABLE agent_terrain ADD COLUMN IF NOT EXISTS telephone_secondaire VARCHAR(100);
ALTER TABLE agent_terrain ADD COLUMN IF NOT EXISTS situation_matrimoniale VARCHAR(100);
ALTER TABLE agent_terrain ADD COLUMN IF NOT EXISTS nombre_enfants INTEGER DEFAULT 0;
ALTER TABLE agent_terrain ADD COLUMN IF NOT EXISTS contact_urgence_nom VARCHAR(255);
ALTER TABLE agent_terrain ADD COLUMN IF NOT EXISTS contact_urgence_telephone VARCHAR(100);
ALTER TABLE agent_terrain ADD COLUMN IF NOT EXISTS contact_urgence_lien VARCHAR(100);

ALTER TABLE piece_justificative ADD COLUMN IF NOT EXISTS date_emission DATE;
ALTER TABLE piece_justificative ADD COLUMN IF NOT EXISTS statut VARCHAR(50) NOT NULL DEFAULT 'VALIDE';
ALTER TABLE piece_justificative ADD COLUMN IF NOT EXISTS alerte_envoyee_le DATE;

ALTER TABLE affectation ADD COLUMN IF NOT EXISTS commune VARCHAR(255);
ALTER TABLE affectation ADD COLUMN IF NOT EXISTS zone_operationnelle VARCHAR(255);
ALTER TABLE affectation ADD COLUMN IF NOT EXISTS motif_affectation VARCHAR(255);
ALTER TABLE affectation ADD COLUMN IF NOT EXISTS decision_url VARCHAR(500);
ALTER TABLE affectation ADD COLUMN IF NOT EXISTS responsable_validant_id UUID;
ALTER TABLE affectation ADD CONSTRAINT fk_affectation_responsable_validant
    FOREIGN KEY (responsable_validant_id) REFERENCES utilisateur(id);

ALTER TABLE pointage ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'QR_CODE';
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS latitude_entree DECIMAL(10,7);
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS longitude_entree DECIMAL(10,7);
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS latitude_sortie DECIMAL(10,7);
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS longitude_sortie DECIMAL(10,7);
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS distance_parcourue_km DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS duree_minutes INTEGER;
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS anomalie TEXT;
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS selfie_url VARCHAR(500);
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS identifiant_nfc VARCHAR(255);
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS source_biometrie VARCHAR(255);

ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_transport DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_logement DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_terrain DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_communication DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_panier DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_anciennete DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS prime_exceptionnelle DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS total_primes DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE bulletin_de_paie ADD COLUMN IF NOT EXISTS avantages_divers_commentaire TEXT;

CREATE TABLE IF NOT EXISTS contrat_agent (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    structure_cliente_id UUID,
    type VARCHAR(50) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE,
    direction VARCHAR(255),
    statut VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    document_url VARCHAR(500),
    CONSTRAINT fk_contrat_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_contrat_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_contrat_structure FOREIGN KEY (structure_cliente_id) REFERENCES structure_demandeuse(id)
);

CREATE TABLE IF NOT EXISTS renouvellement_contrat (
    id UUID PRIMARY KEY,
    contrat_id UUID NOT NULL,
    ancienne_date_fin DATE,
    nouvelle_date_fin DATE NOT NULL,
    motif VARCHAR(255),
    document_url VARCHAR(500),
    cree_le TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_renouvellement_contrat FOREIGN KEY (contrat_id) REFERENCES contrat_agent(id)
);

CREATE TABLE IF NOT EXISTS mission (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    affectation_id UUID,
    titre VARCHAR(255) NOT NULL,
    localisation_lat DECIMAL(10,7),
    localisation_lng DECIMAL(10,7),
    objectifs TEXT,
    planning_debut TIMESTAMP,
    planning_fin TIMESTAMP,
    statut VARCHAR(50) NOT NULL DEFAULT 'PREVUE',
    demarree_le TIMESTAMP,
    CONSTRAINT fk_mission_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_mission_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_mission_affectation FOREIGN KEY (affectation_id) REFERENCES affectation(id)
);

CREATE TABLE IF NOT EXISTS materiel (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    categorie VARCHAR(80) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    numero_serie VARCHAR(255),
    operateur VARCHAR(100),
    forfait VARCHAR(100),
    credit_mensuel VARCHAR(100),
    statut VARCHAR(50) NOT NULL DEFAULT 'DISPONIBLE',
    CONSTRAINT fk_materiel_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE IF NOT EXISTS affectation_materiel (
    id UUID PRIMARY KEY,
    materiel_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    date_remise TIMESTAMP NOT NULL DEFAULT NOW(),
    date_retour TIMESTAMP,
    signature_remise_url VARCHAR(500),
    signature_retour_url VARCHAR(500),
    statut VARCHAR(50) NOT NULL DEFAULT 'REMIS',
    CONSTRAINT fk_affectation_materiel_materiel FOREIGN KEY (materiel_id) REFERENCES materiel(id),
    CONSTRAINT fk_affectation_materiel_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

CREATE TABLE IF NOT EXISTS sanction (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    type VARCHAR(80) NOT NULL,
    motif TEXT,
    decision_url VARCHAR(500),
    date_decision DATE NOT NULL DEFAULT CURRENT_DATE,
    date_fin DATE,
    statut VARCHAR(50) NOT NULL DEFAULT 'EN_COURS',
    CONSTRAINT fk_sanction_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_sanction_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

CREATE TABLE IF NOT EXISTS evaluation_agent (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    annee INTEGER NOT NULL,
    date_evaluation DATE DEFAULT CURRENT_DATE,
    ponctualite INTEGER DEFAULT 0,
    discipline INTEGER DEFAULT 0,
    qualite INTEGER DEFAULT 0,
    productivite INTEGER DEFAULT 0,
    esprit_equipe INTEGER DEFAULT 0,
    respect_procedures INTEGER DEFAULT 0,
    satisfaction_client INTEGER DEFAULT 0,
    communication INTEGER DEFAULT 0,
    score_total INTEGER DEFAULT 0,
    commentaire TEXT,
    CONSTRAINT fk_evaluation_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_evaluation_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

CREATE TABLE IF NOT EXISTS demande_conge (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    type VARCHAR(80) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    motif TEXT,
    justificatif_url VARCHAR(500),
    statut VARCHAR(80) NOT NULL DEFAULT 'EN_ATTENTE_SUPERVISEUR',
    CONSTRAINT fk_demande_conge_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_demande_conge_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

CREATE TABLE IF NOT EXISTS solde_conge (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    annee INTEGER NOT NULL,
    solde_total INTEGER NOT NULL DEFAULT 0,
    jours_consommes INTEGER NOT NULL DEFAULT 0,
    jours_restants INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_solde_conge_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_solde_conge_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT uk_solde_conge_agent_annee UNIQUE (agent_id, annee)
);

CREATE TABLE IF NOT EXISTS notification_evenement (
    id UUID PRIMARY KEY,
    entreprise_id UUID,
    type VARCHAR(100) NOT NULL,
    canal VARCHAR(50) NOT NULL DEFAULT 'WEBHOOK',
    message TEXT,
    statut VARCHAR(50) NOT NULL DEFAULT 'A_ENVOYER',
    cree_le TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notification_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY,
    entreprise_id UUID,
    utilisateur_email VARCHAR(255),
    action VARCHAR(100),
    module VARCHAR(100),
    cible_id VARCHAR(100),
    details TEXT,
    cree_le TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_audit_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE IF NOT EXISTS certification_agent (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    agent_id UUID NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    date_obtention DATE,
    date_expiration DATE,
    document_url VARCHAR(500),
    statut VARCHAR(50) NOT NULL DEFAULT 'VALIDE',
    CONSTRAINT fk_certification_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id),
    CONSTRAINT fk_certification_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id)
);

CREATE TABLE IF NOT EXISTS workflow_definition (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    nombre_etapes INTEGER NOT NULL DEFAULT 2,
    statut VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    CONSTRAINT fk_workflow_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);

CREATE TABLE IF NOT EXISTS regle_prime_rendement (
    id UUID PRIMARY KEY,
    entreprise_id UUID NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    montant_par_point DECIMAL(10,2) NOT NULL DEFAULT 0,
    seuil_minimum INTEGER NOT NULL DEFAULT 0,
    statut VARCHAR(50) NOT NULL DEFAULT 'ACTIF',
    CONSTRAINT fk_regle_prime_entreprise FOREIGN KEY (entreprise_id) REFERENCES entreprise(id)
);
