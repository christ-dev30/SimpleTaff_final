# Cahier des Charges - Suivi des Mises à Jour (SimpleTaff)

Ce document recense l'ensemble des corrections (bugs fix) et des nouvelles fonctionnalités ajoutées à la version actuelle par rapport à l'ancienne version. Ces modifications visent à stabiliser l'application, améliorer l'expérience utilisateur et corriger les dysfonctionnements bloquants.

---

## 1. Module Export & Téléchargement PDF
**Problème initial :** Les utilisateurs obtenaient une erreur "Whitelabel Error Page" (403 Forbidden ou 401 Unauthorized) lors de la tentative de téléchargement des rapports et des bulletins de paie.
**Modifications apportées :**
- Modification de la logique Frontend (`admin-entreprise.js`) pour que le téléchargement via `window.open` inclue automatiquement le Token d'authentification JWT en paramètre d'URL (`?token=...`).
- Mise à jour du filtre de sécurité Backend (`AuthTokenFilter.java`) pour qu'il soit capable d'intercepter et de lire ce Token d'authentification JWT depuis les paramètres de l'URL, en plus de l'en-tête (Header) traditionnel.

## 2. Refonte du Design du Bulletin de Paie (PDF)
**Problème initial :** L'ancien design du PDF ne correspondait plus aux exigences graphiques (absence de modernité).
**Modifications apportées :**
- Réécriture complète de la classe `BulletinPdfBuilder.java`.
- Ajout d'une mise en page structurée en deux colonnes principales : "INFORMATIONS AGENT" et "DÉTAILS PÉRIODE" avec des fonds gris clair.
- Création d'un tableau des rubriques de paie avec des en-têtes colorés (Bleu nuit / Vert très foncé) conformes à la charte graphique.
- Intégration d'un bloc distinctif en vert clair avec une bordure verte pour mettre en évidence la section "NET À PAYER".
- Amélioration de la typographie, des espacements et de l'alignement général.

## 3. Rapport Individuel par Agent
**Problème initial :** Lorsqu'un administrateur téléchargeait le "Rapport de l'Agent", le fichier généré affichait les données globales de toute l'entreprise au lieu des données spécifiques à cet agent.
**Modifications apportées :**
- Création de la méthode spécifique `genererRapportAgent()` dans le backend (`RapportService.java`).
- Cette méthode parcourt la base de données mais applique désormais un filtre strict sur l'ID de l'agent concerné pour : 
    - Ses présences et pointages
    - Ses congés et absences
    - Ses sanctions disciplinaires
    - Ses bulletins de paie
- Mise à jour du contrôleur (`RapportController.java`) pour s'assurer qu'il appelle bien cette nouvelle logique de filtrage lors de l'appel à la route `/agent/{agentId}/export`.

## 4. Stabilité de l'Interface Utilisateur (Écrans Blancs)
**Problème initial :** Les utilisateurs se plaignaient d'écrans blancs ou d'onglets (tabs) qui disparaissaient ou s'affichaient mal lors de la navigation dans le panneau administrateur.
**Modifications apportées :**
- **Structure HTML** : Un audit complet de `index.html` a permis d'identifier et de réparer plusieurs erreurs de balises `<div>` mal fermées (notamment dans les sections *tab-overview*, *tab-presences* et *tab-audit*), qui "avalaient" le reste de la page.
- **Gestion du Cache** : Le navigateur conservait d'anciens fichiers Javascript en mémoire. Une logique d'invalidation du cache (cache-busting) a été mise en place avec le renommage dynamique/incrémental des fichiers `.js` (ajout de `?v=X`) lors du chargement. 
- Configuration Spring Boot ajoutée pour forcer les navigateurs à ne pas mettre en cache le HTML et forcer le téléchargement des nouvelles versions de l'UI.

## 5. Mises à Jour Diverses (Technique)
- Correction des importations de fichiers (imports absolus vs relatifs dans `/shared/api.js`) pour assurer le bon fonctionnement de l'API sur le serveur de production (Railway).
- Ajout de mécanismes de robustesse (sécurité "null-safe") dans l'UI (méthodes `loadOrg`, `loadAdminRemplacements`, `traiterRemplacement`) pour éviter que des données manquantes ne fassent planter le JavaScript.
- Automatisation : Mise en place d'un processus interne où toute modification de code entraîne automatiquement un push sur le dépôt de contrôle de version pour fluidifier les livraisons (déploiements continus).

---
> **Statut actuel :** L'ensemble de ces modifications a été validé, compilé avec succès (`BUILD SUCCESS` sur Maven) et poussé en production. Toutes les fonctionnalités susmentionnées sont 100% opérationnelles.
