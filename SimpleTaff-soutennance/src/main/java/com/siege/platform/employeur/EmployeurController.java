package com.siege.platform.employeur;

import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.pointage.CarteAgent;
import com.siege.platform.pointage.CarteAgentRepository;
import com.siege.platform.pointage.Pointage;
import com.siege.platform.pointage.PointageRepository;
import com.siege.platform.pointage.PointageService;
import com.siege.platform.utilisateur.Employeur;
import com.siege.platform.utilisateur.UtilisateurRepository;
import com.siege.platform.config.tenant.TenantContext;
import com.siege.platform.structuredemandeuse.Site;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Controller for Employeur (client/structure demandeuse) endpoints.
 */
@RestController
@RequestMapping("/api/employeur")
@PreAuthorize("hasRole('EMPLOYEUR')")
public class EmployeurController {

    private final UtilisateurRepository utilisateurRepository;
    private final AffectationRepository affectationRepository;
    private final PointageRepository pointageRepository;
    private final CarteAgentRepository carteAgentRepository;
    private final PointageService pointageService;

    public EmployeurController(UtilisateurRepository utilisateurRepository,
                               AffectationRepository affectationRepository,
                               PointageRepository pointageRepository,
                               CarteAgentRepository carteAgentRepository,
                               PointageService pointageService) {
        this.utilisateurRepository = utilisateurRepository;
        this.affectationRepository = affectationRepository;
        this.pointageRepository = pointageRepository;
        this.carteAgentRepository = carteAgentRepository;
        this.pointageService = pointageService;
    }

    // ── Profil ────────────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Employeur emp = getEmployeur(email);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("email", emp.getEmail());
        m.put("nom", emp.getNom());
        m.put("prenom", emp.getPrenom());
        m.put("role", emp.getRole().toString());
        return ResponseEntity.ok(m);
    }

    // ── Personnel ─────────────────────────────────────────────────────────────

    @GetMapping("/personnel")
    public ResponseEntity<List<Map<String, Object>>> getPersonnel() {
        Employeur emp = getEmployeur(SecurityContextHolder.getContext().getAuthentication().getName());
        java.util.Set<Site> sites = emp.getSites();
        if (sites == null || sites.isEmpty()) return ResponseEntity.ok(List.of());
        List<UUID> siteIds = sites.stream().map(Site::getId).collect(Collectors.toList());

        List<Map<String, Object>> response = affectationRepository.findAllByStatut("ACTIVE").stream()
                .filter(a -> a.getPoste() != null && a.getPoste().getSite() != null && siteIds.contains(a.getPoste().getSite().getId()))
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("agentNom", a.getAgent().getPrenom() + " " + a.getAgent().getNom());
                    m.put("agentId", a.getAgent().getId().toString());
                    m.put("posteLibelle", a.getPoste().getEmploi() != null ? a.getPoste().getEmploi().getLibelle() : "Agent Terrain");
                    m.put("zone", a.getPoste().getSite().getZone() != null ? a.getPoste().getSite().getZone().getNom() : "—");
                    m.put("siteNom", a.getPoste().getSite().getNom() != null ? a.getPoste().getSite().getNom() : "—");
                    m.put("statut", a.getStatut());
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Retourne la liste des agents assignés aux sites de l'employeur
     * sans leur QR code (masqué pour des raisons de sécurité/confidentialité) pour affichage dans le dashboard.
     */
    @GetMapping("/personnel/qr")
    public ResponseEntity<List<Map<String, Object>>> getPersonnelAvecQr() {
        Employeur emp = getEmployeur(SecurityContextHolder.getContext().getAuthentication().getName());
        java.util.Set<Site> sites = emp.getSites();
        if (sites == null || sites.isEmpty()) return ResponseEntity.ok(List.of());
        List<UUID> siteIds = sites.stream().map(Site::getId).collect(Collectors.toList());

        List<Map<String, Object>> response = affectationRepository.findAllByStatut("ACTIVE").stream()
                .filter(a -> a.getPoste() != null && a.getPoste().getSite() != null && siteIds.contains(a.getPoste().getSite().getId()))
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("agentNom", a.getAgent().getPrenom() + " " + a.getAgent().getNom());
                    m.put("agentId", a.getAgent().getId().toString());
                    m.put("posteLibelle", a.getPoste().getEmploi() != null ? a.getPoste().getEmploi().getLibelle() : "Agent Terrain");
                    m.put("siteNom", a.getPoste().getSite().getNom() != null ? a.getPoste().getSite().getNom() : "—");
                    m.put("statut", a.getStatut());

                    // Récupération de la carte active de l'agent (le QR code est masqué pour l'employeur)
                    carteAgentRepository.findByAgentIdAndStatut(a.getAgent().getId(), "ACTIVE").ifPresentOrElse(
                            carte -> {
                                m.put("codeQr", ""); // Masqué pour l'employeur
                                m.put("identifiantNfc", carte.getIdentifiantNfc() != null ? carte.getIdentifiantNfc() : "");
                                m.put("carteId", carte.getId().toString());
                                  m.put("carteStatut", carte.getStatut());
                            },
                            () -> {
                                m.put("codeQr", "");
                                m.put("identifiantNfc", "");
                                m.put("carteId", "");
                                m.put("carteStatut", "AUCUNE");
                            }
                    );
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ── Pointages ─────────────────────────────────────────────────────────────

    @GetMapping("/pointages/today")
    public ResponseEntity<List<Map<String, Object>>> getPointagesToday() {
        return getPointagesByDate(LocalDate.now());
    }

    @GetMapping("/pointages")
    public ResponseEntity<List<Map<String, Object>>> getPointages(
            @RequestParam(value = "date", required = false)
            @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE)
            LocalDate date) {
        return getPointagesByDate(date != null ? date : LocalDate.now());
    }

    @GetMapping("/pointages/dates")
    public ResponseEntity<List<Map<String, Object>>> getPointageDates() {
        Employeur emp = getEmployeur(SecurityContextHolder.getContext().getAuthentication().getName());
        java.util.Set<Site> sites = emp.getSites();
        if (sites == null || sites.isEmpty()) return ResponseEntity.ok(List.of());

        List<UUID> siteIds = sites.stream().map(Site::getId).collect(Collectors.toList());
        List<Object[]> datesWithCounts = pointageRepository.findPointageDatesWithCountsForSites(siteIds);

        List<Map<String, Object>> response = new ArrayList<>();
        for (Object[] row : datesWithCounts) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", row[0] != null ? row[0].toString() : null);
            map.put("total", row[1]);
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    private ResponseEntity<List<Map<String, Object>>> getPointagesByDate(LocalDate date) {
        Employeur emp = getEmployeur(SecurityContextHolder.getContext().getAuthentication().getName());
        java.util.Set<Site> sites = emp.getSites();
        if (sites == null || sites.isEmpty()) return ResponseEntity.ok(List.of());
        List<UUID> siteIds = sites.stream().map(Site::getId).collect(Collectors.toList());

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();

        List<Map<String, Object>> response = pointageRepository
                .findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(start, end).stream()
                .filter(p -> p.getAffectation() != null
                        && p.getAffectation().getPoste() != null
                        && p.getAffectation().getPoste().getSite() != null
                        && siteIds.contains(p.getAffectation().getPoste().getSite().getId()))
                .map(p -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", p.getId());
                    map.put("agent_nom", p.getAffectation().getAgent().getPrenom() + " " + p.getAffectation().getAgent().getNom());
                    map.put("heure_entree", p.getDateHeureEntree());
                    map.put("heure_sortie", p.getDateHeureSortie());
                    map.put("statut", p.getStatut());
                    return map;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // ── Statistiques ──────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Employeur emp = getEmployeur(SecurityContextHolder.getContext().getAuthentication().getName());
        java.util.Set<Site> sites = emp.getSites();
        Map<String, Object> result = new LinkedHashMap<>();

        if (sites == null || sites.isEmpty()) {
            result.put("totalAgents", 0);
            result.put("pointagesAujourdhui", 0);
            return ResponseEntity.ok(result);
        }
        List<UUID> siteIds = sites.stream().map(Site::getId).collect(Collectors.toList());

        long totalAgents = affectationRepository.findAllByStatut("ACTIVE").stream()
                .filter(a -> a.getPoste() != null && a.getPoste().getSite() != null && siteIds.contains(a.getPoste().getSite().getId()))
                .count();

        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().plusDays(1).atStartOfDay();
        long pointagesAujourdhui = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(start, end).stream()
                .filter(p -> p.getAffectation() != null
                        && p.getAffectation().getPoste() != null
                        && p.getAffectation().getPoste().getSite() != null
                        && siteIds.contains(p.getAffectation().getPoste().getSite().getId()))
                .count();

        result.put("totalAgents", totalAgents);
        result.put("pointagesAujourdhui", pointagesAujourdhui);
        return ResponseEntity.ok(result);
    }

    // ── Scanner ───────────────────────────────────────────────────────────────

    @PostMapping("/pointages/scanner")
    public ResponseEntity<?> scanner(@RequestBody Map<String, Object> payload) {
        Object qrObj = payload.get("qrCode");
        if (qrObj == null) qrObj = payload.get("cardId");
        if (qrObj == null) qrObj = payload.get("identifiantNfc");
        if (qrObj == null) qrObj = payload.get("sourceBiometrie");

        Object typeObj = payload.get("type");
        if (typeObj == null) typeObj = payload.get("typePointage");

        if (!(qrObj instanceof String) || ((String) qrObj).isBlank() || !(typeObj instanceof String)) {
            return ResponseEntity.badRequest().body(Map.of("error", "QR Code/ID de carte et type de pointage manquants"));
        }

        String cardId = (String) qrObj;
        String typePointage = (String) typeObj;

        if (!"ENTREE".equals(typePointage) && !"SORTIE".equals(typePointage)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Type de pointage invalide"));
        }

        UUID entrepriseId = TenantContext.getTenantId();
        if (entrepriseId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Contexte tenant non disponible"));
        }

        String mode = (String) payload.get("mode");
        if (mode == null) mode = "QR_CODE";

        try {
            Pointage pointage = pointageService.scannerCarte(cardId, typePointage, mode);
            
            // Appliquer les extras
            if (payload.get("anomalie") != null) pointage.setAnomalie((String) payload.get("anomalie"));
            if (payload.get("selfieUrl") != null) pointage.setSelfieUrl((String) payload.get("selfieUrl"));
            if (payload.get("identifiantNfc") != null) pointage.setIdentifiantNfc((String) payload.get("identifiantNfc"));
            if (payload.get("sourceBiometrie") != null) pointage.setSourceBiometrie((String) payload.get("sourceBiometrie"));
            if (payload.get("latitude") != null && payload.get("longitude") != null) {
                java.math.BigDecimal lat = new java.math.BigDecimal(payload.get("latitude").toString());
                java.math.BigDecimal lng = new java.math.BigDecimal(payload.get("longitude").toString());
                if (pointage.getDateHeureSortie() == null) {
                    pointage.setLatitudeEntree(lat);
                    pointage.setLongitudeEntree(lng);
                } else {
                    pointage.setLatitudeSortie(lat);
                    pointage.setLongitudeSortie(lng);
                }
            }
            if (pointage.getDateHeureSortie() != null && pointage.getDateHeureEntree() != null) {
                pointage.setDureeMinutes((int) java.time.Duration.between(pointage.getDateHeureEntree(), pointage.getDateHeureSortie()).toMinutes());
            }
            
            pointageRepository.save(pointage);

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("message", "Pointage enregistré avec succès — Mode " + mode + " / " + typePointage);
            res.put("id", pointage.getId());
            res.put("agentNom", pointage.getAffectation().getAgent().getPrenom() + " " + pointage.getAffectation().getAgent().getNom());
            res.put("heureEntree", pointage.getDateHeureEntree());
            res.put("heureSortie", pointage.getDateHeureSortie());
            res.put("statut", pointage.getStatut());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage() != null ? e.getMessage() : "Erreur lors du pointage"));
        }
    }

    // ── Utilitaire privé ─────────────────────────────────────────────────────

    private Employeur getEmployeur(String email) {
        return (Employeur) utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Employeur non trouvé : " + email));
    }
}
