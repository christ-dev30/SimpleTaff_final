# DOCUMENT PRÉPARATOIRE AUX MODÉLISATIONS UML
## Projet : SimpleTaff - Plateforme de Gestion RH et Pointage

Ce document est spécialement structuré pour vous fournir toutes les informations nécessaires à la réalisation de vos trois diagrammes UML (Cas d'Utilisation, Classes, et Séquence).

---

## 1. POUR LE DIAGRAMME DES CAS D'UTILISATION (DCU)

Ce diagramme doit montrer les interactions entre les acteurs (utilisateurs ou systèmes externes) et les fonctionnalités du système (cas d'utilisation).

### 1.1 Les Acteurs
*   **Acteurs Humains Principaux :**
    *   **Super Administrateur** : Gérant de la plateforme SaaS.
    *   **Administrateur Entreprise (RH)** : Responsable RH ou gérant de la société prestataire (locataire SaaS).
    *   **Coordonnateur (Chef de Zone)** : Responsable du déploiement des agents sur le terrain.
    *   **Employeur (Client Final)** : Représentant du site où l'agent effectue sa mission.
    *   **Agent Terrain** : Employé déployé sur le terrain (interagit indirectement via son badge, ou directement s'il a accès à une interface).
*   **Acteur Système (Non-Humain) :**
    *   **Scheduler (Horloge Système)** : Déclenche des actions automatiques.

### 1.2 Les Cas d'Utilisation par Acteur

*   **Super Administrateur :**
    *   Gérer les entreprises (Créer, suspendre).
    *   Gérer les abonnements SaaS.
*   **Administrateur Entreprise :**
    *   Valider un enrôlement d'agent.
    *   Établir les contrats de travail.
    *   Gérer le catalogue des emplois et les grilles salariales.
    *   Générer les bulletins de paie (Mensuel).
    *   Générer les factures pour les employeurs (Clients).
*   **Coordonnateur :**
    *   Enrôler un agent (Collecte des données et pièces jointes).
    *   Affecter un agent à un site/une zone.
    *   Attribuer du matériel (Dotation).
*   **Employeur :**
    *   Scanner le badge de l'agent (Valider un pointage Entrée/Sortie).
    *   Consulter les rapports de présence de son site.
    *   Télécharger les factures.
*   **Agent Terrain :**
    *   S'authentifier sur le terrain (via QR Code ou NFC).
*   **Scheduler (Système) :**
    *   Vérifier l'expiration des pièces administratives (CNI, Visas).
    *   Clôturer automatiquement les journées de pointage incomplètes.

*(Note UML : N'oubliez pas d'utiliser des liens `<<include>>` (ex: "Générer la paie" inclut "Calculer les heures de présence") et `<<extend>>` (ex: "Valider un pointage" est étendu par "Signaler une anomalie GPS" si le pointage est hors zone).)*

---

## 2. POUR LE DIAGRAMME DE CLASSES

Ce diagramme modélise la structure statique du système, les entités métiers, leurs attributs et leurs relations.

### 2.1 Entités Principales et Attributs
*   **`Entreprise` (Le Tenant SaaS)**
    *   `id` (UUID)
    *   `nom` (String)
    *   `email` (String)
    *   `statut` (Enum: ACTIF, SUSPENDU)
    *   `formuleAbonnement` (String)
*   **`Utilisateur`**
    *   `id` (UUID)
    *   `email` (String)
    *   `motDePasse` (String crypté)
    *   `role` (Enum: SUPER_ADMIN, ADMIN_ENTREPRISE, COORDONNATEUR, EMPLOYEUR)
*   **`AgentTerrain`**
    *   `id` (UUID)
    *   `nom` (String), `prenom` (String)
    *   `telephone` (String)
    *   `statut` (Enum: EN_ATTENTE, EN_SERVICE, INACTIF)
*   **`CarteAgent` (Badge)**
    *   `id` (UUID)
    *   `codeQrJwt` (String)
    *   `identifiantNfc` (String)
*   **`Zone` et `Site` (Lieux de mission)**
    *   `Zone` : `id` (UUID), `nom` (String)
    *   `Site` : `id` (UUID), `nom` (String), `latitude` (Double), `longitude` (Double)
*   **`Affectation` (Lien entre l'Agent et le Site)**
    *   `id` (UUID)
    *   `dateDebut` (Date), `dateFin` (Date)
    *   `statut` (String)
*   **`Pointage`**
    *   `id` (UUID)
    *   `heureEntree` (Timestamp), `heureSortie` (Timestamp)
    *   `mode` (Enum: QR, NFC, BIOMETRIE)
    *   `statut` (Enum: VALIDE, ANOMALIE)
*   **`BulletinPaie`**
    *   `id` (UUID)
    *   `periode` (String ex: "08/2026")
    *   `salaireBrut` (Double), `salaireNet` (Double)

### 2.2 Relations (Associations et Multiplicités)
*   `Entreprise` `1` ----- `0..*` `Utilisateur` *(Une entreprise possède plusieurs utilisateurs)*
*   `Entreprise` `1` ----- `0..*` `AgentTerrain` *(Une entreprise gère plusieurs agents)*
*   `AgentTerrain` `1` ----- `1` `CarteAgent` *(Un agent possède un seul badge actif)*
*   `Zone` `1` ----- `1..*` `Site` *(Une zone géographique regroupe plusieurs sites clients)*
*   `AgentTerrain` `1` ----- `0..*` `Affectation` *(Un agent peut avoir plusieurs affectations dans le temps)*
*   `Site` `1` ----- `0..*` `Affectation` *(Un site accueille plusieurs affectations d'agents)*
*   `Affectation` `1` ----- `0..*` `Pointage` *(Une affectation génère de multiples pointages journaliers)*
*   `AgentTerrain` `1` ----- `0..*` `BulletinPaie` *(Un agent reçoit plusieurs bulletins)*

---

## 3. POUR LE DIAGRAMME DE SÉQUENCE

Ce diagramme doit illustrer la chronologie des messages entre les objets lors de l'exécution d'une action précise. Voici le scénario le plus critique de SimpleTaff : **Le Pointage Quotidien par QR Code**.

*   **Titre du diagramme :** Enregistrement d'un pointage d'entrée.
*   **Acteurs et Lignes de vie (Lifelines) :**
    1.  `Agent` (Acteur)
    2.  `Terminal Employeur` (Interface Frontend)
    3.  `PointageController` (API Backend)
    4.  `PointageService` (Logique Métier)
    5.  `Base de Données` (MySQL)

### 3.1 Chronologie des messages (Étapes à dessiner de haut en bas)

1.  **`Agent` -> `Terminal Employeur`** : Présente son Badge QR Code.
2.  **`Terminal Employeur` -> `Terminal Employeur`** : Scanne le QR Code et récupère les coordonnées GPS du téléphone de l'employeur.
3.  **`Terminal Employeur` -> `PointageController`** : `POST /api/pointage/scanner` (Payload: JWT du code QR, Latitude, Longitude).
4.  **`PointageController` -> `PointageService`** : `traiterPointage(jwt, gps)`
5.  **`PointageService` -> `PointageService`** : Décoder et vérifier la signature du JWT (Sécurité anti-fraude).
    *   *Cadre `[alt]` (Alternative) - Si JWT invalide :* Retourne une exception "Badge falsifié" au `Terminal Employeur`.
6.  **`PointageService` -> `Base de Données`** : Vérifier si l'agent a une `Affectation` active ce jour-là.
7.  **`Base de Données` -> `PointageService`** : Retourne les infos de l'affectation et du `Site` (avec son GPS attendu).
8.  **`PointageService` -> `PointageService`** : Comparer le GPS envoyé par le terminal avec le GPS du Site (Geofencing).
    *   *Cadre `[opt]` (Optionnel) - Si hors zone :* Marque le pointage avec le statut "ANOMALIE_GPS".
9.  **`PointageService` -> `Base de Données`** : `save(nouveau Pointage)`
10. **`Base de Données` -> `PointageService`** : Retourne l'entité Pointage créée.
11. **`PointageService` -> `PointageController`** : Retourne le DTO (Data Transfer Object) de succès.
12. **`PointageController` -> `Terminal Employeur`** : Code HTTP `200 OK` (Données du pointage).
13. **`Terminal Employeur` -> `Agent`** : Affiche un message de succès vert avec la photo de l'agent.
