package com.siege.platform.entreprise;

import com.siege.platform.common.enums.FormuleAbonnement;
import com.siege.platform.common.enums.StatutEntreprise;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/superadmin")
public class SuperAdminController {

    private final EntrepriseRepository entrepriseRepository;
    private final JdbcTemplate jdbcTemplate;
    private final com.siege.platform.notification.NotificationService notificationService;

    public SuperAdminController(EntrepriseRepository entrepriseRepository, JdbcTemplate jdbcTemplate, com.siege.platform.notification.NotificationService notificationService) {
        this.entrepriseRepository = entrepriseRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.notificationService = notificationService;
    }

    @GetMapping("/entreprises")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Entreprise>> getEntreprises() {
        return ResponseEntity.ok(entrepriseRepository.findAll());
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getStats() {
        Long totalClients = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM entreprise", Long.class);
        Long actifs = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM entreprise WHERE statut = 'ACTIF'", Long.class);
        Long coordonnateurs = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM utilisateur WHERE role = 'COORDONNATEUR'", Long.class);
        
        Long revenuMensuel = jdbcTemplate.queryForObject("SELECT SUM(CASE WHEN formule_abonnement = 'STARTER' THEN 49000 WHEN formule_abonnement = 'PRO' THEN 120000 ELSE 0 END) FROM entreprise WHERE statut = 'ACTIF'", Long.class);
        
        Long currentMonthCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM entreprise WHERE YEAR(date_creation) = YEAR(CURRENT_DATE) AND MONTH(date_creation) = MONTH(CURRENT_DATE)", Long.class);
        Long lastMonthCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM entreprise WHERE YEAR(date_creation) = YEAR(CURRENT_DATE - INTERVAL 1 MONTH) AND MONTH(date_creation) = MONTH(CURRENT_DATE - INTERVAL 1 MONTH)", Long.class);
        
        double croissance = 0;
        if (lastMonthCount != null && lastMonthCount > 0) {
            croissance = ((double) (currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
        } else if (currentMonthCount != null && currentMonthCount > 0) {
            croissance = 100; // si aucun client le mois dernier mais des clients ce mois-ci
        }

        List<Map<String, Object>> nouveauxAdmins = jdbcTemplate.queryForList("SELECT u.nom, u.prenom, u.email, u.date_creation, e.nom as entreprise_nom FROM utilisateur u LEFT JOIN entreprise e ON u.entreprise_id = e.id WHERE u.role = 'ADMIN_ENTREPRISE' ORDER BY u.date_creation DESC LIMIT 5");

        List<Map<String, Object>> activeEntreprises = jdbcTemplate.queryForList("SELECT formule_abonnement, date_creation FROM entreprise WHERE statut = 'ACTIF'");
        List<Map<String, Object>> chartData = new java.util.ArrayList<>();
        java.time.YearMonth currentMonth = java.time.YearMonth.now();
        String[] monthNames = {"Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"};
        
        for (int i = 6; i >= 0; i--) {
            java.time.YearMonth ym = currentMonth.minusMonths(i);
            long monthlyRev = 0;
            for (Map<String, Object> ent : activeEntreprises) {
                Object dateObj = ent.get("date_creation");
                java.time.LocalDateTime ldt = null;
                if (dateObj instanceof java.sql.Timestamp) {
                    ldt = ((java.sql.Timestamp) dateObj).toLocalDateTime();
                } else if (dateObj instanceof java.time.LocalDateTime) {
                    ldt = (java.time.LocalDateTime) dateObj;
                } else if (dateObj instanceof java.sql.Date) {
                    ldt = ((java.sql.Date) dateObj).toLocalDate().atStartOfDay();
                }
                
                if (ldt != null) {
                    java.time.YearMonth entYm = java.time.YearMonth.from(ldt);
                    if (!entYm.isAfter(ym)) {
                        String formule = (String) ent.get("formule_abonnement");
                        if ("STARTER".equals(formule)) monthlyRev += 49000;
                        else if ("PRO".equals(formule)) monthlyRev += 120000;
                    }
                }
            }
            chartData.add(Map.of(
                "label", monthNames[ym.getMonthValue() - 1],
                "revenue", monthlyRev
            ));
        }

        List<Map<String, Object>> abonnementsExpires = jdbcTemplate.queryForList("SELECT nom, date_creation FROM entreprise WHERE statut IN ('SUSPENDUE', 'INACTIF') ORDER BY date_creation DESC LIMIT 1");
        Map<String, Object> abonnementExpire = abonnementsExpires.isEmpty() ? null : abonnementsExpires.get(0);

        return ResponseEntity.ok(Map.of(
            "totalClients", totalClients != null ? totalClients : 0L,
            "abonnementsActifs", actifs != null ? actifs : 0L,
            "coordonnateurs", coordonnateurs != null ? coordonnateurs : 0L,
            "revenuMensuel", revenuMensuel != null ? revenuMensuel : 0L,
            "croissanceMensuelle", Math.round(croissance),
            "chartData", chartData,
            "nouveauxAdmins", nouveauxAdmins,
            "abonnementExpire", abonnementExpire != null ? abonnementExpire : ""
        ));
    }

    @PostMapping("/entreprises")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Entreprise> createEntreprise(@RequestBody Map<String, Object> payload) {
        String nom = (String) payload.getOrDefault("nom", "Nouvelle Entreprise");
        String formuleStr = (String) payload.getOrDefault("formuleAbonnement", "PRO");
        Object cotisationRaw = payload.getOrDefault("tauxCotisation", "5.50");

        Entreprise entreprise = new Entreprise();
        entreprise.setNom(nom);

        try {
            entreprise.setFormuleAbonnement(FormuleAbonnement.valueOf(formuleStr));
        } catch (IllegalArgumentException e) {
            entreprise.setFormuleAbonnement(FormuleAbonnement.PRO);
        }

        try {
            entreprise.setTauxCotisation(new BigDecimal(cotisationRaw.toString()));
        } catch (NumberFormatException e) {
            entreprise.setTauxCotisation(new BigDecimal("5.50"));
        }

        entreprise.setStatut(StatutEntreprise.ACTIF);

        Entreprise saved = entrepriseRepository.save(entreprise);
        
        notificationService.creerAlerte(saved, "SUPER_ADMIN", "Nouvelle entreprise cliente enregistrée : " + nom);
        
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/entreprises/{id}/suspendre")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> suspendreEntreprise(@PathVariable("id") UUID id) {
        return entrepriseRepository.findById(id)
                .map(entreprise -> {
                    entreprise.setStatut(StatutEntreprise.SUSPENDUE);
                    entrepriseRepository.save(entreprise);
                    notificationService.creerAlerte(entreprise, "SUPER_ADMIN", "L'entreprise " + entreprise.getNom() + " a été suspendue.");
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/entreprises/{id}/activer")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> activerEntreprise(@PathVariable("id") UUID id) {
        return entrepriseRepository.findById(id)
                .map(entreprise -> {
                    entreprise.setStatut(StatutEntreprise.ACTIF);
                    entrepriseRepository.save(entreprise);
                    notificationService.creerAlerte(entreprise, "SUPER_ADMIN", "L'entreprise " + entreprise.getNom() + " a été réactivée.");
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private byte[] uuidToBytes(UUID uuid) {
        if (uuid == null) return null;
        java.nio.ByteBuffer bb = java.nio.ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return bb.array();
    }

    @DeleteMapping("/entreprises/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<?> supprimerEntreprise(@PathVariable("id") UUID id) {
        try {
            // Check if enterprise exists before deleting to get its name
            String nomEntreprise = entrepriseRepository.findById(id).map(Entreprise::getNom).orElse("Inconnue");
            
            // Dans Hibernate 6 avec MySQL, les UUID sont stockés en binary(16).
            // JdbcTemplate ne fait pas la conversion automatique, on passe donc un byte[].
            byte[] idBytes = uuidToBytes(id);
            
            // 1. Pointages de l'entreprise
            jdbcTemplate.update("DELETE FROM pointage WHERE entreprise_id = ?", idBytes);
            
            // 2. Cartes agent des agents de l'entreprise
            jdbcTemplate.update("DELETE FROM carte_agent WHERE agent_id IN (SELECT id FROM agent_terrain WHERE entreprise_id = ?)", idBytes);
            
            // 3. Pieces justificatives
            jdbcTemplate.update("DELETE FROM piece_justificative WHERE agent_id IN (SELECT id FROM agent_terrain WHERE entreprise_id = ?)", idBytes);
            
            // 4. Competences agent_emploi
            jdbcTemplate.update("DELETE FROM agent_emploi WHERE agent_id IN (SELECT id FROM agent_terrain WHERE entreprise_id = ?)", idBytes);
            
            // 5. Affectations
            jdbcTemplate.update("DELETE FROM affectation WHERE entreprise_id = ?", idBytes);
            
            // 6. Bulletins de paie
            jdbcTemplate.update("DELETE FROM bulletin_de_paie WHERE entreprise_id = ?", idBytes);
            
            // 7. Factures
            jdbcTemplate.update("DELETE FROM facture WHERE entreprise_id = ?", idBytes);
            
            // 8. Postes
            jdbcTemplate.update("DELETE FROM poste WHERE entreprise_id = ?", idBytes);
            
            // 9. Employeur_site
            jdbcTemplate.update("DELETE FROM employeur_site WHERE site_id IN (SELECT id FROM site WHERE structure_demandeuse_id IN (SELECT id FROM structure_demandeuse WHERE entreprise_id = ?))", idBytes);
            
            // 10. Sites
            jdbcTemplate.update("DELETE FROM site WHERE structure_demandeuse_id IN (SELECT id FROM structure_demandeuse WHERE entreprise_id = ?)", idBytes);
            
            // 11. Agents de terrain
            jdbcTemplate.update("DELETE FROM agent_terrain WHERE entreprise_id = ?", idBytes);
            
            // 12. Utilisateurs de l'entreprise
            jdbcTemplate.update("DELETE FROM utilisateur WHERE entreprise_id = ?", idBytes);
            
            // 13. Structures demandeuses
            jdbcTemplate.update("DELETE FROM structure_demandeuse WHERE entreprise_id = ?", idBytes);
            
            // 14. Emplois
            jdbcTemplate.update("DELETE FROM emploi WHERE entreprise_id = ?", idBytes);
            
            // 15. Zones
            jdbcTemplate.update("DELETE FROM zone WHERE entreprise_id = ?", idBytes);
            
            // 15.5 Invitations
            jdbcTemplate.update("DELETE FROM invitation_entreprise WHERE entreprise_id = ?", idBytes);
            
            // 16. L'entreprise elle-même
            int rowsDeleted = jdbcTemplate.update("DELETE FROM entreprise WHERE id = ?", idBytes);
            
            if (rowsDeleted > 0) {
                notificationService.creerAlerte(null, "SUPER_ADMIN", "L'entreprise " + nomEntreprise + " a été définitivement supprimée.");
                return ResponseEntity.noContent().build();
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur lors de la suppression en cascade: " + e.getMessage()));
        }
    }
}
