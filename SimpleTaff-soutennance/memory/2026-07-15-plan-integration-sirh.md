# Plan d'integration SIRH terrain - nouvelles specifications

## 0. Etat actuel du projet

- Backend: Spring Boot, JPA, Flyway, multi-tenant par `entreprise_id`.
- Front web: pages statiques par role dans `src/main/resources/static`.
- Modules deja presents: agents, zones, postes/affectations, pointage QR, paie, absences longues, dotations, facturation, dashboard.
- Prochaine migration Flyway: `V13__Sirh_Extensions.sql`.

## 1. Navigation cible

Sidebar Admin Entreprise:

- Vue d'ensemble
- Agents
- Contrats
- Affectations & Missions
- Pointage
- Presences
- Materiel
- Paie & Primes
- Conges & Absences
- Disciplinaire
- Evaluations
- Rapports
- Audit
- Parametres

Fiche agent en tabs:

- Identite
- Contrats
- Affectations
- Missions
- Documents
- Materiel
- Formations
- Conges
- Paie
- Disciplinaire
- Evaluations

## 2. Lot 1 - Agent administratif

UI:

- `admin-entreprise/index.html`: remplacer la creation agent simple par un formulaire en sections.
- Section infos perso: `situationMatrimoniale`, `nombreEnfants`.
- Section contact: `telephoneSecondaire`, `contactUrgenceNom`, `contactUrgenceTelephone`, `contactUrgenceLien`.
- Tab Documents: galerie avec type, fichier, date emission, date expiration, statut.
- Header fiche agent: bouton `Generer fiche agent`.

Backend:

- Etendre `AgentTerrain`.
- Etendre `PieceJustificative` avec `dateEmission`, `statut`, `alerteEnvoyeeLe`.
- Ajouter `AgentDocumentService`.
- Ajouter endpoint export: `GET /api/agents/{id}/fiche?format=pdf|docx`.

Migration:

- Colonnes `agent_terrain`: situation_matrimoniale, nombre_enfants, telephone_secondaire, contact_urgence_nom, contact_urgence_telephone, contact_urgence_lien.
- Colonnes `piece_justificative`: date_emission, statut, alerte_envoyee_le.

## 3. Lot 2 - RH & contrats

UI:

- Nouveau menu `Contrats`.
- Tab Contrats dans fiche agent: liste + creation + chronologie de renouvellements.
- Dashboard RH: bloc `Alertes expirations`.

Backend:

- Nouveau package `contrat`.
- Entites: `ContratAgent`, `RenouvellementContrat`.
- Controller: `ContratController`.
- Endpoints:
  - `GET/POST /api/contrats`
  - `GET /api/agents/{id}/contrats`
  - `POST /api/contrats/{id}/renouvellements`
  - `GET /api/contrats/expirations?jours=30`

Migration:

- Table `contrat_agent`: agent_id, entreprise_id, type, date_debut, date_fin, structure_cliente_id, direction, statut, document_url.
- Table `renouvellement_contrat`: contrat_id, ancienne_date_fin, nouvelle_date_fin, motif, document_url, cree_le.
- Types autorises: CDI, CDD, STAGE, VACATION, CONSULTANT, PRESTATAIRE.

## 4. Lot 3 - Affectations & missions

UI:

- Tab Affectations: ajouter commune, zone operationnelle, motif, decision PDF, responsable validant.
- Afficher historique chronologique complet.
- Nouveau tab Missions: localisation GPS, objectifs rich text, planning calendrier, carte.
- Bouton `Demarrer mission` visible si statut `PREVUE`.

Backend:

- Etendre `Affectation`.
- Nouveau package `mission`.
- Entite `Mission`.
- Controller `MissionController`.
- Endpoints:
  - `GET/POST /api/missions`
  - `POST /api/missions/{id}/demarrer`
  - `POST /api/missions/{id}/suspendre`
  - `POST /api/missions/{id}/annuler`

Migration:

- Colonnes `affectation`: commune, zone_operationnelle, motif_affectation, decision_url, responsable_validant_id.
- Table `mission`: agent_id, affectation_id, entreprise_id, titre, localisation_lat, localisation_lng, objectifs, planning_debut, planning_fin, statut, demarree_le.
- Statuts mission: PREVUE, EN_COURS, TERMINEE, SUSPENDUE, ANNULEE.

## 5. Lot 4 - Materiel

UI:

- Nouveau menu `Materiel`.
- Sous-onglets: Telephones & SIM, Informatique, Equipements terrain, Consommables.
- Dans fiche agent: inventaire affecte + historique.
- Remise/Retour: modal avec signature tactile.

Backend:

- Nouveau package `materiel`.
- Entites: `Materiel`, `AffectationMateriel`, `HistoriqueMateriel`, `SignatureMateriel`.
- Controller `MaterielController`.
- Endpoints:
  - `GET/POST /api/materiels`
  - `POST /api/materiels/{id}/remise`
  - `POST /api/materiels/{id}/retour`
  - `POST /api/materiels/{id}/incident`

Migration:

- Tables `materiel`, `affectation_materiel`, `historique_materiel`, `signature_materiel`.
- Categories: TELEPHONE_SIM, INFORMATIQUE, TERRAIN, CONSOMMABLE.
- Statuts: DISPONIBLE, AFFECTE, PERTE, VOL, CASSE, DECLASSEMENT.

## 6. Lot 5 - Pointage & presences

UI Pointage:

- Menu `Pointage`.
- Modes: QR_CODE, NFC, PHOTO_GPS, BIOMETRIE.
- Champs: arrivee, depart, GPS, distance, duree, anomalies.
- Mobile prioritaire: camera, GPS, tactile.

Backend:

- Etendre `Pointage`.
- Adapter `PointageController` au mode choisi.
- Service calcul distance/duree.

Migration:

- Colonnes `pointage`: mode, latitude_entree, longitude_entree, latitude_sortie, longitude_sortie, distance_parcourue_km, duree_minutes, anomalie, selfie_url, identifiant_nfc, source_biometrie.

UI Presences:

- Menu `Presences`.
- Tableau mensuel avec filtres mois/annee.
- Colonnes calculees: retards, heures sup, jours feries, nuit, dimanches.
- Export Excel.

Backend:

- Nouveau package `presence`.
- `PresenceService` calcule depuis `pointage`.
- Controller `PresenceController`.
- Endpoint: `GET /api/presences?mois=YYYY-MM`.
- Endpoint export: `GET /api/presences/export?mois=YYYY-MM`.

## 7. Lot 6 - Paie & primes

UI:

- Dans calcul paie: lignes de primes transport, logement, terrain, communication, panier, anciennete, exceptionnelle.
- Champ commentaire `avantagesDivers`.
- Sous-module `Primes de rendement`: regle parametrable + simulation avant validation.
- Bas fiche paie: salaire net calcule.

Backend:

- Etendre `BulletinDePaie`.
- Entites: `Prime`, `ReglePrimeRendement`, `PrimeRendementAgent`.
- Controller `PrimeController`.
- `PaieCalculService`: inclure primes et score missions.

Migration:

- Colonnes `bulletin_de_paie`: prime_transport, prime_logement, prime_terrain, prime_communication, prime_panier, prime_anciennete, prime_exceptionnelle, avantages_divers_commentaire, total_primes.
- Tables `regle_prime_rendement`, `prime_rendement_agent`.

## 8. Lot 7 - Conges & absences

UI:

- Menu `Conges & Absences`.
- Types: annuel, maladie, maternite, paternite, exceptionnel, permission, absence autorisee, absence injustifiee.
- Dashboard agent: solde total, consomme, restant.
- Absence injustifiee: workflow Superviseur -> RH -> Direction.

Backend:

- Nouveau controller dedie `CongeController`.
- Entites: `DemandeConge`, `SoldeConge`, `ValidationAbsence`.
- Workflow branche sur service transversal.

Migration:

- Tables `demande_conge`, `solde_conge`, `validation_absence`.

## 9. Lot 8 - Disciplinaire & evaluations

Disciplinaire UI:

- Menu RH `Disciplinaire`.
- Sous-menu Sanctions.
- Fiche agent: alerte visuelle si sanction en cours.

Disciplinaire backend:

- Package `disciplinaire`.
- Entite `Sanction`.
- Controller `DisciplinaireController`.
- Types: AVERTISSEMENT, BLAME, MISE_A_PIED, SUSPENSION, LICENCIEMENT.

Evaluations UI:

- Menu Performances `Evaluations`.
- Grille sur 100 avec 8 criteres.
- Radar ou jauge.
- Historique annuel par agent.

Evaluations backend:

- Package `evaluation`.
- Entites `EvaluationAgent`, `CritereEvaluation`.
- Controller `EvaluationController`.

Migration:

- Tables `sanction`, `evaluation_agent`, `critere_evaluation`.

## 10. Lot 9 - Dashboard, rapports, transversal

Dashboard KPI:

- Agents actifs, disponibles, en mission, en conge.
- Taux occupation, taux presence.
- Masse salariale, primes versees du mois.
- Materiels affectes/en panne.
- Contrats expirant, documents expirant.

Rapports:

- `RapportController`.
- Exports PDF/Excel/Word:
  - historique missions
  - historique affectations
  - historique pointages
  - etat materiels
  - bulletins paie individuel/masse
  - journal primes
  - journal conges

Notifications:

- Package `notification`.
- Entite `NotificationEvenement`.
- Service central webhook/SMS/Email/WhatsApp.
- Parametres par entreprise dans `parametre_notification`.

Geolocalisation:

- Carte Leaflet dans Missions et Pointage.
- Droits par role pour temps reel.

Formations:

- Tab `Formations` fiche agent.
- Entite `CertificationAgent` avec date expiration.

Audit:

- Menu admin `Audit`.
- Entite `AuditLog`.
- Aspect JPA/controller pour creation, modification, validation, suppression.

Workflow configurable:

- Entites `WorkflowDefinition`, `WorkflowStep`, `WorkflowInstance`.
- Ecran `Parametres workflows`.

Scheduler:

- `ExpirationScheduler` quotidien:
  - documents
  - contrats
  - certifications
  - materiel en anomalie
- Envoie via `NotificationService`.

## 11. Ordre d'implementation recommande

1. `V13__Sirh_Extensions.sql`: colonnes agent, pieces, affectation, pointage, paie.
2. Lots Agent + Documents + Scheduler alertes documents.
3. Contrats + alertes expirations dashboard.
4. Affectations enrichies + missions.
5. Pointage enrichi + presences mensuelles.
6. Materiel + signature.
7. Paie + primes de rendement.
8. Conges + workflow absence injustifiee.
9. Disciplinaire + evaluations.
10. Rapports + audit + notifications + workflows configurables.

## 12. Packages backend a creer

- `com.siege.platform.contrat`
- `com.siege.platform.mission`
- `com.siege.platform.materiel`
- `com.siege.platform.presence`
- `com.siege.platform.prime`
- `com.siege.platform.conge`
- `com.siege.platform.disciplinaire`
- `com.siege.platform.evaluation`
- `com.siege.platform.rapport`
- `com.siege.platform.notification`
- `com.siege.platform.audit`
- `com.siege.platform.workflow`
- `com.siege.platform.formation`
- `com.siege.platform.scheduler`

## 13. Fichiers front principaux a modifier

- `src/main/resources/static/admin-entreprise/index.html`: menus RH, dashboard, agents, contrats, affectations, missions, materiel, paie, conges, disciplinaire, evaluations, rapports, audit, parametres.
- `src/main/resources/static/coordonnateur/index.html`: pointage terrain, anomalies, missions, dotations/materiel.
- `src/main/resources/static/employeur/index.html`: validation pointages, presences, missions, rapports client.
- `src/main/resources/static/shared/api.js`: centraliser les nouveaux appels API.
- `src/main/resources/static/shared/global.css`: styles tabs, alertes, badges statut, timelines, signatures.

## 14. Regles de donnees importantes

- Garder `entreprise_id` sur toutes les tables metier multi-tenant.
- Garder UUID partout.
- Ne pas supprimer l'historique: cloturer par statut/date.
- Tout upload stocke seulement une URL en base.
- Les statuts doivent etre des constantes Java ou enums avant d'etre exposes au front.
- Les exports ne doivent lire que les donnees du tenant courant.
- Les actions sensibles doivent ecrire dans `audit_log`.
