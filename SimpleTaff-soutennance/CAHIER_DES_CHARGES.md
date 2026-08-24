# CAHIER DES CHARGES COMPLET - PROJET SIMPLETAFF

## 1. INTRODUCTION ET CONTEXTE

### 1.1. Présentation du Projet
**SimpleTaff** est une plateforme SaaS (Software as a Service) centralisée dédiée à la gestion des ressources humaines, de la planification et du suivi des agents de terrain. Elle est conçue pour optimiser les processus administratifs, logistiques et opérationnels au sein d'une entreprise employant de nombreux collaborateurs déployés sur des sites distincts (comme des agents de sécurité, techniciens de surface, ouvriers, etc.).

### 1.2. Objectifs Principaux
- **Centraliser** la gestion administrative (contrats, paies, sanctions, congés).
- **Tracer et suivre** le déploiement opérationnel des équipes (pointage, affectations).
- **Fluidifier la communication** entre les différents échelons hiérarchiques (Employeur, Coordonnateur, Agent).
- **Dématérialiser** les documents clés (Bulletins de paie, rapports, badges professionnels).

---

## 2. PÉRIMÈTRE FONCTIONNEL ET RÔLES (RBAC)

Le système intègre un contrôle d'accès basé sur les rôles (RBAC - Role-Based Access Control) garantissant que chaque acteur n'accède qu'aux informations et fonctionnalités qui lui incombent.

### 2.1. Super Administrateur (`SUPER_ADMIN`)
Garant du bon fonctionnement global de la plateforme, ce profil gère le volet SaaS.
- **Gestion des Clients :** Création, modification, suspension ou suppression des entreprises abonnées.
- **Facturation et Abonnements :** Suivi des licences et de la facturation des entreprises clientes.
- **Supervision :** Accès aux métriques globales de performance de la plateforme.

### 2.2. Administrateur Entreprise / Employeur (`ADMIN_ENTREPRISE`)
Le dirigeant ou le responsable des ressources humaines de l'entreprise cliente.
- **Ressources Humaines :** Enregistrement des employés (Agents, Coordonnateurs), gestion des dossiers administratifs et des contrats.
- **Gestion Logistique :** Configuration de l'organigramme opérationnel (Structures Demandeuses, Sites, Zones).
- **Gestion de la Paie :** Configuration des paramètres de paie, édition et génération en masse ou individuelle des bulletins de paie au format PDF.
- **Suivi et Analytique :** Tableaux de bord globaux (taux de présence, effectifs), consultation des rapports d'activité.

### 2.3. Coordonnateur (`COORDONNATEUR`)
Le superviseur de terrain ou chef d'équipe, chargé de l'opérationnel au quotidien.
- **Planification :** Affectation des agents sur les postes vacants et définition des horaires d'intervention.
- **Suivi Temps Réel :** Contrôle des présences et des pointages sur les sites.
- **Remplacements :** Gestion des absences (signalement rapide d'un agent défaillant et déclenchement d'une demande de remplacement).
- **Évaluation :** Rédaction des rapports de performance ou disciplinaires sur les agents.
- **Validation :** Traitement en première instance des requêtes des agents (ex: demandes d'EPI).

### 2.4. Agent de Terrain (`AGENT`)
L'employé déployé sur le terrain.
- **Identité Numérique :** Carte Agent avec QR Code pour l'identification sur site.
- **Pointage :** Déclaration de prise et de fin de service.
- **Requêtes :** Soumission de demandes de matériel, de congés ou signalements d'incidents.
- **Documents :** Accès sécurisé à ses bulletins de paie, plannings et contrats.

---

## 3. MODULES ET FONCTIONNALITÉS DÉTAILLÉES

### 3.1. Module Utilisateurs et Sécurité
- Authentification centralisée avec gestion de mots de passe cryptés (BCrypt).
- Suppression en cascade (Cascade Delete) : la suppression d'un agent entraîne automatiquement l'archivage/suppression de ses données associées (affectations, pointages) pour maintenir l'intégrité de la base.
- Gestion des invitations et de l'onboarding (Invitations Entreprise).

### 3.2. Module Opérationnel (Déploiement)
- **Structures et Sites :** Création de l'arborescence du lieu de travail.
- **Affectations :** Assignation dynamique d'un Agent à un Poste sur un Site précis.
- **Pointage :** Enregistrement des heures d'arrivée et de départ (potentiellement géolocalisé ou scanné).

### 3.3. Module Paie et Finance
- Moteur de calcul de paie intégré (`PaieCalculService`).
- Paramétrage personnalisé (Taux horaire, primes, déductions, cotisations).
- Générateur PDF de fiches de paie professionnelles (Header structuré, colonnes claires, Net à payer en évidence).

### 3.4. Module Logistique (Matériel)
- Catalogue de matériel et Équipements de Protection Individuelle (EPI).
- Workflow de demande de matériel depuis l'Agent, avec approbation par le Coordonnateur puis l'Employeur.

### 3.5. Module Notification et Workflow
- Alertes en temps réel pour les événements critiques (absences, demandes en attente).
- Workflows d'approbation standardisés pour toutes les requêtes RH et matérielles.

### 3.6. Module Génération Documentaire et Exports
- **Cartes Agents :** Génération de badges d'entreprise avec QR Codes via JS client (jsPDF).
- **Rapports Analytiques :** Génération de rapports PDF complets incluant les métriques de présence et de performance.

---

## 4. ARCHITECTURE TECHNIQUE ET STACK

L'application repose sur une architecture moderne de type client-serveur, séparant strictement la logique métier (Backend) de l'interface utilisateur (Frontend).

### 4.1. Backend (Serveur et API)
- **Langage / Framework :** Java avec Spring Boot.
- **Sécurité :** Spring Security, authentification Stateless par JSON Web Token (JWT). Les requêtes de téléchargement de fichiers autorisent le passage du token en paramètre d'URL (`?token=`).
- **ORM / Base de données :** Spring Data JPA / Hibernate (compatible PostgreSQL / MySQL).
- **Génération PDF :** iText / OpenPDF pour la création de documents côté serveur.
- **Tâches asynchrones :** Schedulers intégrés (`ExpirationScheduler`) pour purger ou mettre à jour des statuts temporels.

### 4.2. Frontend (Interface Utilisateur)
- **Technologies web :** HTML5, CSS3, JavaScript Vanilla (ES6 Modules).
- **Architecture :** Approche SPA (Single Page Application) ou multi-SPA par type de rôle (fichiers `index.html` séparés par espace).
- **Design et Intégration :** Utilisation intensive de **Tailwind CSS** pour des interfaces responsives, modernes et esthétiques.
- **Gestion du Cache :** Stratégie de *Cache Busting* (versioning `?v=X` sur l'appel des scripts) pour forcer la mise à jour chez le client.
- **Structure des imports :** Imports relatifs stricts pour la compatibilité avec les serveurs de production.

### 4.3. Intégrité et Déploiement
- Le code source est structuré pour une compilation sans erreur via Maven (`mvn clean compile`).
- Déploiement Cloud (ex: Railway, Heroku, AWS).

---

## 5. ERGONOMIE ET DESIGN (UI/UX)
- **Approche "Mobile First" et Responsive :** L'interface doit être parfaitement lisible sur mobile pour les Agents et Coordonnateurs sur le terrain, et sur Desktop pour les administrateurs.
- **Composants Dynamiques :** Utilisation de modals, de notifications toast et de tableaux interactifs pour limiter le rechargement complet des pages.
- **Design du Bulletin de Paie :** Esthétique premium, garantissant la lisibilité des informations financières pour l'employé.

---

## 6. CONTRAINTES DE SÉCURITÉ ET DE PERFORMANCE
- **Isolement des Données :** Un employeur (ou coordonnateur) ne peut visualiser que les données rattachées à son entreprise. Les requêtes Backend intègrent ce filtrage strict pour prévenir la fuite de données d'un client à l'autre.
- **Robustesse des API :** Gestion globale des exceptions (Global Exception Handling) pour retourner des messages clairs sans exposer le stack trace au client.

---
*Ce document fait office de référence technique et fonctionnelle pour la plateforme SimpleTaff. Toute nouvelle implémentation devra s'y conformer et mettre à jour les sections concernées.*
