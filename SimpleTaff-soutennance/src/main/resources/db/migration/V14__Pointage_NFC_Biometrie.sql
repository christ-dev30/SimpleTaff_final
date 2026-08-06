-- NFC/biometrie identifiers for carte_agent
-- Adds nullable fields so existing cards keep working.

ALTER TABLE carte_agent
    ADD COLUMN IF NOT EXISTS identifiant_nfc TEXT,
    ADD COLUMN IF NOT EXISTS source_biometrie TEXT;

