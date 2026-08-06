-- V9__Invitation_Entreprise.sql
-- Table pour stocker les invitations d'inscription envoyées par le Super Admin

CREATE TABLE invitation_entreprise (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token           VARCHAR(255) NOT NULL UNIQUE,
    email_destinataire VARCHAR(255) NOT NULL,
    entreprise_id   UUID NOT NULL REFERENCES entreprise(id) ON DELETE CASCADE,
    formule_abonnement VARCHAR(50) NOT NULL,
    utilise         BOOLEAN NOT NULL DEFAULT FALSE,
    date_creation   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL
);

CREATE INDEX idx_invitation_token ON invitation_entreprise(token);
CREATE INDEX idx_invitation_email ON invitation_entreprise(email_destinataire);
