# CAHIER DES CHARGES - PROJET SIMPLETAFF

## 1. PRÉSENTATION DU PROJET
**SimpleTaff** est une plateforme SaaS (Software as a Service) centralisée de gestion des ressources humaines, de planification et de suivi des agents de terrain. Elle est conçue pour optimiser la gestion administrative (contrats, paies, congés, sanctions), logistique (affectations, matériel) et opérationnelle (pointage, remplacements) au sein d'une entreprise employant de nombreux collaborateurs déployés sur site.

---

## 2. ARCHITECTURE TECHNIQUE ET STACK
Le projet repose sur une architecture moderne séparant la logique métier et la présentation via une API REST sécurisée.
- **Backend (Logique Serveur & API) :** Java / Spring Boot.
- **Sécurité :** Spring Security avec authentification par Token JWT (JSON Web Token), incluant le support de passage par paramètre d'URL (pour les exports PDF).
- **Frontend (Interface Utilisateur) :** HTML5, CSS3, Vanilla JavaScript (ES Modules), et **Tailwind CSS** pour le design. Architecture en Single Page Application (SPA) modulée par espaces.
- **Génération Documentaire (PDF) :** Intégration côté serveur (iText / OpenPDF) pour la génération de rapports analytiques et de bulletins de paie sur mesure, et côté client (jsPDF, QRCode.js) pour la génération de badges.

---

## 3. LES ACTEURS ET PROFILS (RÔLES)
Le système gère le contrôle d'accès basé sur les rôles (RBAC). Chaque acteur possède un espace dédié (`/super-admin`, `/admin-entreprise`, `/coordonnateur`, `/agent`).

### 3.1. Super Administrateur (SUPER_ADMIN)
Garant du bon fonctionnement global de la plateforme, il gère les entités abonnées.
- Création, modification et suspension des entreprises clientes.
- Gestion des abonnements et facturations des clients.
- Supervision technique et métriques de performance.

### 3.2. Administrateur Entreprise / Employeur (ADMIN_ENTREPRISE)
Le dirigeant ou responsable RH de l'entreprise cliente.
- **Gestion du Personnel :** Embauche, gestion des dossiers administratifs.
- **Gestion de la Paie :** Génération des bulletins de paie avec un design structuré (Informations Agent, Détails Période, Rubriques, Net à payer).
- **Rapports et Analytiques :** Tableau de bord global, taux de présence, téléchargement de rapports (Globaux ou par Agent filtré).
- **Gestion Logistique :** Sites, zones d'affectation et validation des demandes de matériel.

### 3.3. Coordonnateur (COORDONNATEUR)
Superviseur opérationnel, il gère le terrain au quotidien.
- **Affectations :** Assigne les agents sur différents sites et postes vacants (avec gestion des horaires d'arrivée et départ).
- **Suivi des Présences :** Visualise en temps réel les agents sur site, gère les absences et les retards.
- **Remplacements :** Signale et organise le remplacement d'un agent défaillant ou absent.
- **Évaluations et Sanctions :** Évalue le personnel sur le terrain et soumet les rapports disciplinaires.

### 3.4. Agent de Terrain (AGENT)
Employé déployé sur les sites de l'entreprise.
- **Pointage :** Validation de prise et fin de service (potentiellement via scan de badge QR Code).
- **Demandes :** Soumission des demandes de congés ou de matériel (EPI).
- **Documents :** Accès à ses propres bulletins de paie, contrats et emplois du temps.

---

## 4. FONCTIONNALITÉS PRINCIPALES (FEATURES)

1. **Tableaux de bord dynamiques (Dashboards) :** Statistiques en temps réel (Taux de présence, couverture des zones, requêtes en attente).
2. **Génération de PDF (Export) :** 
   - Bulletins de paie chartés (Colonnes, rubriques financières, Net à Payer mis en évidence).
   - Rapports de performance analytiques complets.
   - Badges professionnels avec QR Code d'identification.
3. **Module de Pointage et Affectations :** Suivi strict des heures travaillées contre les heures attendues.
4. **Gestion Documentaire et Dépendances :** Suppression en cascade (Cascade Delete) lors du retrait d'un employé (supprime affectations, contrats, pointages liés).
5. **Système de Notification et Validation :** Workflow d'approbation entre le Coordonnateur et l'Employeur pour les équipements et absences.

---

## 5. HISTORIQUE DES MISES À JOUR ET CORRECTIFS RÉCENTS

Cette section trace les dernières résolutions techniques majeures apportées au code source :

### 5.1. Résolutions de Bugs (Bug Fixes)
- **Erreur de Syntaxe JavaScript (Ecran figé) :** Correction d'un bug majeur (accolade fermante manquante) dans `coordonnateur.js` suite à l'ajout des remplacements, qui empêchait le chargement de l'interface des coordonnateurs, employeurs et super-admins.
- **Problème de Cache Navigateur (Ecran Blanc / Figer) :** Implémentation du *Cache Busting* (ajout du paramètre de versioning `?v=X` sur l'appel des scripts JS) et correction massive des balises `<div>` HTML mal formées.
- **Erreur de Téléchargement 403 (Forbidden) sur les PDF :** Modification de l'architecture d'authentification pour tolérer les requêtes de téléchargement de type `window.open` via un paramètre d'URL `?token=...`, intercepté par le `AuthTokenFilter`.
- **Rapports Agents Inexacts :** Développement de la fonction de filtrage strict côté serveur (`genererRapportAgent`) empêchant les données globales de l'entreprise d'apparaître sur le rapport individuel d'un agent.

### 5.2. Nouvelles Implémentations (Features)
- **Design Bulletin de Paie :** Création d'une nouvelle identité visuelle pour les bulletins (Header structuré, double colonne, emphase sur le net).
- **Module de Remplacement :** Ajout de la fonctionnalité de signalement de remplacement rapide par le Coordonnateur (`openModalSignalerRemplacement`).
- **Gestion des Dépendances (Delete) :** Sécurisation de la méthode de suppression d'agent pour effacer proprement la base de données.
- **Imports Sécurisés :** Remplacement des imports absolus par des imports relatifs sécurisés (`../shared/api.js`) pour garantir l'intégrité de l'application sur le serveur de production Railway.

---

> **Validation Technique** : Le système est stable. Les règles d'import, l'intégrité de compilation (`mvn clean compile`), l'authentification et l'UI ont été auditées et certifiées fonctionnelles. Le code a été versionné et déployé (Continuous Deployment / Git Push).
