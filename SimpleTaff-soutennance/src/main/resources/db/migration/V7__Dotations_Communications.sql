CREATE TABLE demande_dotation (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    demandeur_coordonnateur_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    statut VARCHAR(50) NOT NULL,
    date_remise TIMESTAMP,
    CONSTRAINT fk_dotation_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_dotation_coord FOREIGN KEY (demandeur_coordonnateur_id) REFERENCES utilisateur(id)
);

CREATE TABLE communication_agent (
    id UUID PRIMARY KEY,
    agent_id UUID NOT NULL,
    emetteur_coordonnateur_id UUID,
    canal VARCHAR(50) NOT NULL,
    type_message VARCHAR(100) NOT NULL,
    contenu TEXT NOT NULL,
    date_envoi TIMESTAMP NOT NULL,
    statut_accuse_reception VARCHAR(50) NOT NULL,
    CONSTRAINT fk_comm_agent FOREIGN KEY (agent_id) REFERENCES agent_terrain(id),
    CONSTRAINT fk_comm_coord FOREIGN KEY (emetteur_coordonnateur_id) REFERENCES utilisateur(id)
);
