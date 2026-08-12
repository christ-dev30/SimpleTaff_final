# CAHIER DES CHARGES TECHNIQUE ET FONCTIONNEL (Analyse du Projet Actuel)
## Projet : SimpleTaff (Soutenance)

---

## 1. PRÉSENTATION ET ARCHITECTURE GLOBALE

### 1.1 Objectif du Projet
**SimpleTaff** est une plateforme SaaS (Software as a Service) développée pour simplifier et digitaliser la gestion de la main-d'œuvre temporaire et du personnel de terrain. Elle couvre l'ensemble du cycle de vie des agents : enrôlement, pointage sur site, paie, facturation, et gestion disciplinaire.

### 1.2 Architecture Technique Actuelle (Analyse du code)
Contrairement aux spécifications initiales qui mentionnaient PostgreSQL, l'analyse du code source et des fichiers de configuration (`application.properties`) révèle l'architecture suivante :

*   **Backend (Cœur de métier)** : Java 21 avec le framework Spring Boot 3.3.0.
*   **Base de Données** : MySQL (Pilote `com.mysql.cj.jdbc.Driver`).
*   **ORM et Persistance** : Spring Data JPA / Hibernate (Configuration `ddl-auto=update`).
*   **Migrations de Base de Données** : Flyway (Scripts présents de `V1__` à `V17__`, bien que désactivé par défaut dans le fichier de configuration actuel pour permettre les mises à jour JPA).
*   **Sécurité et Authentification** : Spring Security couplé avec JWT (JSON Web Tokens).
*   **Frontend (Interface Utilisateur)** : Multiples SPAs (Single Page Applications) découpées par rôle, construites en HTML, CSS, et Vanilla JS (fichiers `index.html` massifs par dossier de rôle).
*   **Envoi d'Emails** : Intégration SMTP via Brevo (ex-Sendinblue).

---

## 2. DÉCOUPAGE PAR RÔLES ET INTERFACES (FRONTEND)

L'application front-end est hébergée dans le dossier `src/main/resources/static` et est divisée en plusieurs portails web distincts :

1.  **Vitrine (`/vitrine/`)** : Le site public de présentation et d'inscription (`inscription.html`).
2.  **Super-Admin (`/super-admin/`)** : L'interface du propriétaire de la plateforme SaaS. Permet de gérer les entreprises clientes, les abonnements et la configuration globale.
3.  **Admin Entreprise (`/admin-entreprise/`)** : Le tableau de bord du gestionnaire RH/Paie de l'entreprise prestataire. Permet de gérer les agents, valider la paie, facturer les clients, et configurer les référentiels.
4.  **Coordonnateur (`/coordonnateur/`)** : L'espace du chef de zone. Il permet l'enrôlement des agents, l'affectation sur le terrain, et la gestion du matériel.
5.  **Employeur (`/employeur/`)** : L'interface pour le client final (sur site). Il permet le suivi des présences et la validation des pointages des agents détachés.

---

## 3. ANALYSE DES MODULES FONCTIONNELS (BACKEND)

Le code source Java (`src/main/java/com/siege/platform/`) est structuré de manière modulaire (Domain-Driven Design simplifié). Voici l'explication de chaque module clé :

### 3.1 Gestion des Accès et de l'Entreprise
*   **`auth` & `config`** : Gèrent la sécurité, les filtres JWT, la configuration CORS, et l'authentification des requêtes.
*   **`utilisateur` & `entreprise`** : Gestion des comptes utilisateurs liés à un Tenant (Entreprise). Permet l'isolation stricte des données (SaaS Multi-tenant).
*   **`invitation`** : Système de workflow pour inviter de nouveaux utilisateurs ou administrateurs via e-mail avec un token sécurisé.

### 3.2 Gestion des Agents et du Dossier RH
*   **`agent` & `contrat`** : Cœur du système RH. Gère l'enrôlement des agents de terrain, la génération des contrats de travail, et le suivi de leur statut.
*   **`emploi` & `poste`** : Référentiels des métiers et des grilles salariales.
*   **`absence`, `conge`, `disciplinaire`** : Suivi des congés payés, des absences injustifiées et du volet disciplinaire (avertissements, mises à pied).
*   **`evaluation` & `formation`** : Suivi de la performance des agents sur le terrain et de leurs habilitations/certifications.

### 3.3 Opérations Terrain : Pointage et Missions
*   **`pointage`** : C'est un module critique qui gère l'horodatage hybride. Il supporte des entrées/sorties quotidiennes, intégrant des vérifications (vraisemblablement QR code, géolocalisation, ou NFC selon le frontend). Les migrations SQL (`V11`, `V14`) montrent une évolution pour supporter le NFC, la biométrie et un cycle quotidien strict.
*   **`mission` & `zone`** : Gestion des affectations géographiques. Les agents sont affectés à des zones sous la supervision de coordonnateurs.
*   **`structuredemandeuse`** : Les clients finaux chez qui les agents sont détachés.

### 3.4 Paie et Facturation
*   **`paie` & `prime`** : Calcul automatisé des bulletins de paie. Prend en compte les salaires de base, les primes (rendement, transport) et les déductions pour absence.
*   **`facturation`** : Génération des factures à destination des structures demandeuses (clients finaux), basées sur les pointages validés et les contrats des agents.

### 3.5 Logistique et Communication
*   **`materiel` & `dotation`** : Suivi des inventaires (EPI, tenues, smartphones) et attribution aux agents.
*   **`communication` & `notification`** : Gestion des alertes internes (ex: pièce d'identité arrivant à expiration).

### 3.6 Sécurité et Audit
*   **`audit`** : Journalisation inaltérable (Audit Log) de toutes les actions critiques (modifications de paie, suppression de contrats) pour assurer la traçabilité.
*   **`scheduler`** : Tâches planifiées automatisées (Cron jobs) pour envoyer des alertes d'expiration de documents ou clore des cycles de paie.

---

## 4. PROCESSUS ET WORKFLOWS CLÉS (ACTIONS)

1.  **L'Enrôlement (Coordonnateur -> Admin Entreprise)** : Le coordonnateur saisit les données de l'agent et téléverse les justificatifs. Le système valide la taille (limite à 13 Mo selon `application.properties`). L'Admin Entreprise valide le profil et génère le contrat.
2.  **Le Workflow de Pointage (Agent -> Employeur)** : L'agent arrive sur site. Un pointage est déclenché. Le système valide la présence via le contrôleur REST (`PointageController`). En fin de mois, l'employeur valide le rapport des présences.
3.  **La Clôture de Paie (Mensuelle)** : Le système consolide les pointages, déduit les absences, ajoute les primes (`PrimeController`), et génère un bulletin de paie numérisé (format PDF via `OpenPDF`).
4.  **L'Alerting Automatique** : Le module `scheduler` vérifie quotidiennement les dates d'expiration des pièces d'identité et génère des notifications via le module `notification`.

---

## 5. RECOMMANDATIONS TECHNIQUES DE L'EXPERT

1.  **Optimisation Frontend** : Les fichiers `index.html` dans les dossiers de rôles sont excessivement volumineux (ex: >400 Ko pour `admin-entreprise/index.html`). Il serait crucial de découper le code JavaScript et CSS dans des fichiers externes pour améliorer le temps de chargement et la maintenabilité.
2.  **Sécurisation MySQL** : La propriété `spring.jpa.hibernate.ddl-auto=update` est active en production. Il est fortement recommandé de passer cette valeur à `validate` et de réactiver **Flyway** (`spring.flyway.enabled=true`) pour maîtriser strictement le schéma de base de données.
3.  **Stockage Fichiers** : Actuellement, les limites de téléchargement sont configurées (13MB). Il faudrait s'assurer que les fichiers (photos, CVs) soient stockés soit sur un Bucket S3, soit dans un répertoire externe sécurisé, et non dans le dossier de l'application pour garantir la scalabilité.
4.  **Logging** : Les fichiers de logs à la racine (`spring.log`, `console.log`) sont très volumineux. Une stratégie de rotation des logs via `Logback` devrait être configurée.
