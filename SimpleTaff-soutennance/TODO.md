# TODO — Intégration spécifications SIRH (terrain)

- [ ] 0) Valider l’objectif: chaque nouvelle donnée/action atterrit au bon endroit (UI/UX + Back/Front)
- [x] 1) Localiser les écrans front existants: 
       • Admin entreprise: page unique `admin-entreprise/index.html` avec tabs (contrats/missions/pointage/presences/materiel/conges/disciplinaires/evaluations/rapports/audit).
       • Employeur: page `employeur/index.html` contient déjà un écran pointage QR (scanner) + validation entrée/sortie.
       • Coordonnateur: page `coordonnateur/index.html` contient supervision + liste pointages.
- [x] 2) Étendre l’écran pointage côté employeur pour supporter les 4 modes demandés (QR, NFC, Photo+GPS, Biométrie) selon droits.


- [ ] 3) Mettre à jour la navigation UI (sidebar admin entreprise) si des items manquent.
- [ ] 4) Backend: ajouter/compléter endpoints manquants (export fiche agent pdf/docx, alertes expirations contrats/docs, lifecycle missions, exports présences, etc.).

- [ ] 5) Backend: scheduler (expiration docs/contrats/certifs) et envoi notifications.
- [ ] 6) Frontend admin: remplacer placeholders par listes + boutons + timeline/alertes.
- [ ] 7) Frontend employeur: enrichir pointage avec modes NFC/Photo/biométrie selon droits.
- [ ] 8) Piloter calcul Présences (retards/heures sup/jours fériés/nuit/dimanches) + export.
- [ ] 9) Paie & primes: étendre calcul (primes + rendement) + affichage net.
- [ ] 10) Congés: types + workflow 3 étapes absence injustifiée.
- [ ] 11) Disciplinaire & Evaluations: tables, affichages radar/jauge, historique annuel.
- [ ] 12) Rapports exports + Audit menu + UI.


