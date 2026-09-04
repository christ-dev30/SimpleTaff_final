-- V8__Seed_Data.sql — Script idempotent (ON CONFLICT DO NOTHING)

-- Insertion d'une entreprise de test
INSERT INTO entreprise (id, nom, statut, formule_abonnement, date_creation, taux_cotisation, seuil_absence_longue_jours, taux_retenue_reduite)
VALUES (
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'SimpleTaff Agence Côte d''Ivoire',
    'ACTIF',
    'PRO',
    CURRENT_TIMESTAMP,
    5.50,
    21,
    25.00
)
ON CONFLICT (id) DO NOTHING;

-- Insertion de la structure cliente (Bolloré Port Abidjan)
INSERT INTO structure_demandeuse (id, entreprise_id, raison_sociale, secteur, besoins_recurrents)
VALUES (
    'b4f9c94c-4e71-5d49-9d21-324d5dcc9f2b',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'Bolloré Port Abidjan',
    'Logistique & Transport',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Insertion des utilisateurs de test (mot de passe : 'password')
INSERT INTO utilisateur (id, nom, prenom, email, mot_de_passe_hash, role, entreprise_id, statut, date_creation, structure_demandeuse_id)
VALUES (
    'c5a0d05d-5f82-6e5a-ad32-435e6edd0f3c',
    'Ehui', 'Junior (SuperAdmin)',
    'superadmin@simpletaff.com',
    '$2a$10$F0qnAsJML5OdYsYuYhe5OudXyhBbEfqBLOpOZ2VB7TCmKyVa76vau',
    'SUPER_ADMIN',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'ACTIF', CURRENT_TIMESTAMP, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO utilisateur (id, nom, prenom, email, mot_de_passe_hash, role, entreprise_id, statut, date_creation, structure_demandeuse_id)
VALUES (
    'd6b1e16e-6a93-7f6b-be43-546f7fee1f4d',
    'Konan', 'Jean (Admin)',
    'admin@simpletaff.com',
    '$2a$10$F0qnAsJML5OdYsYuYhe5OudXyhBbEfqBLOpOZ2VB7TCmKyVa76vau',
    'ADMIN_ENTREPRISE',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'ACTIF', CURRENT_TIMESTAMP, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO utilisateur (id, nom, prenom, email, mot_de_passe_hash, role, entreprise_id, statut, date_creation, structure_demandeuse_id)
VALUES (
    'e7c2f27f-7b04-4a7c-bf54-657a8aff2a5e',
    'Aka', 'Marc (Coordonnateur)',
    'coord@simpletaff.com',
    '$2a$10$F0qnAsJML5OdYsYuYhe5OudXyhBbEfqBLOpOZ2VB7TCmKyVa76vau',
    'COORDONNATEUR',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'ACTIF', CURRENT_TIMESTAMP, NULL
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO utilisateur (id, nom, prenom, email, mot_de_passe_hash, role, entreprise_id, statut, date_creation, structure_demandeuse_id)
VALUES (
    'f8d3a38a-8c15-4a8d-ad65-768a9aff3a6f',
    'Bamba', 'Aya (Employeur Client)',
    'employeur@simpletaff.com',
    '$2a$10$F0qnAsJML5OdYsYuYhe5OudXyhBbEfqBLOpOZ2VB7TCmKyVa76vau',
    'EMPLOYEUR',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'ACTIF', CURRENT_TIMESTAMP,
    'b4f9c94c-4e71-5d49-9d21-324d5dcc9f2b'
)
ON CONFLICT (id) DO NOTHING;

-- Zone géographique
INSERT INTO zone (id, entreprise_id, nom, description, perimetre, statut)
VALUES (
    'f01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'Zone Portuaire Abidjan',
    'Zone couvrant les quais et entrepôts du port',
    '5km autour du Port Autonome',
    'ACTIF'
)
ON CONFLICT (id) DO NOTHING;

-- Emploi / Qualification
INSERT INTO emploi (id, entreprise_id, libelle, description, categorie, competences_requises, salaire_brut_reference)
VALUES (
    'e01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5d',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'Gardien de Nuit',
    'Surveillance nocturne des sites et des marchandises',
    'Sécurité',
    'Vigilance, Rigueur, Self-défense',
    150000.00
)
ON CONFLICT (id) DO NOTHING;

-- Agent terrain
INSERT INTO agent_terrain (id, entreprise_id, zone_id, nom, prenom, contact, statut)
VALUES (
    'a01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5e',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'f01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
    'Kouassi', 'Koffi Junior',
    '+225 0707070707',
    'ACTIF'
)
ON CONFLICT (id) DO NOTHING;

-- Association agent ↔ emploi
INSERT INTO agent_emploi (agent_id, emploi_id)
VALUES (
    'a01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5e',
    'e01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5d'
)
ON CONFLICT (agent_id, emploi_id) DO NOTHING;

-- Site client (Port Autonome de Vridi)
INSERT INTO site (id, structure_demandeuse_id, zone_id, nom, adresse)
VALUES (
    'aa1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f',
    'b4f9c94c-4e71-5d49-9d21-324d5dcc9f2b',
    'f01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c',
    'Port Autonome de Vridi (Quai 5)',
    'Zone Portuaire, Vridi, Abidjan'
)
ON CONFLICT (id) DO NOTHING;

-- Liaison employeur ↔ site
INSERT INTO employeur_site (employeur_id, site_id)
VALUES (
    'f8d3a38a-8c15-4a8d-ad65-768a9aff3a6f',
    'aa1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f'
)
ON CONFLICT (employeur_id, site_id) DO NOTHING;

-- Poste de travail
INSERT INTO poste (id, entreprise_id, site_id, emploi_id, categorie_appliquee, salaire_brut_negocie, montant_retenue_forfaitaire, statut)
VALUES (
    'bb1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'aa1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f',
    'e01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5d',
    'Sécurité',
    180000.00,
    0.00,
    'ACTIF'
)
ON CONFLICT (id) DO NOTHING;

-- Affectation active de Koffi Junior
INSERT INTO affectation (id, entreprise_id, poste_id, agent_id, date_debut_occupation, date_fin_occupation, motif_fin, statut)
VALUES (
    'cc1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f',
    'a3e8b83b-3d60-4c38-8c10-213c4cbb8f1a',
    'bb1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f',
    'a01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5e',
    '2026-07-01',
    NULL, NULL,
    'ACTIVE'
)
ON CONFLICT (id) DO NOTHING;

-- Carte QR active de Koffi Junior (code = son ID agent)
INSERT INTO carte_agent (id, agent_id, code_qr, statut, date_emission)
VALUES (
    'dd1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5f',
    'a01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5e',
    'a01a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5e',
    'ACTIVE',
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
