package com.siege.platform.pointage;

import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.Poste;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pointages")
public class PointageController {

    private final PointageService pointageService;
    private final PointageRepository pointageRepository;

    public PointageController(PointageService pointageService, PointageRepository pointageRepository) {
        this.pointageService = pointageService;
        this.pointageRepository = pointageRepository;
    }

    @PostMapping("/scanner")
    @PreAuthorize("hasAnyRole('COORDONNATEUR', 'EMPLOYEUR', 'ADMIN_ENTREPRISE')")
    public ResponseEntity<?> scannerPointage(@RequestBody Map<String, String> payload) {
        String cardId = payload.get("cardId");
        if (cardId == null || cardId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'identifiant de la carte est requis."));
        }
        
        String mode = payload.get("mode");
        if (mode == null || mode.trim().isEmpty()) {
            mode = "QR_CODE";
        }
        
        try {
            Pointage pointage = pointageService.scannerCarte(cardId, payload.get("typePointage"), mode);
            applyPointageExtras(pointage, payload);
            pointageRepository.save(pointage);
            return ResponseEntity.ok(toResponse(pointage));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(e)));
        }
    }

    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('COORDONNATEUR', 'EMPLOYEUR', 'ADMIN_ENTREPRISE')")
    public ResponseEntity<List<Map<String, Object>>> getPointagesToday() {
        return getPointagesByDate(LocalDate.now());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('COORDONNATEUR', 'EMPLOYEUR', 'ADMIN_ENTREPRISE')")
    public ResponseEntity<List<Map<String, Object>>> getPointages(
            @RequestParam(value = "date", required = false) LocalDate date,
            @RequestParam(value = "agentId", required = false) UUID agentId,
            @RequestParam(value = "mois", required = false) String mois) {
        
        List<Map<String, Object>> response = new ArrayList<>();
        List<Pointage> pointages;

        if (agentId != null) {
            if (mois != null && !mois.isBlank()) {
                try {
                    java.time.YearMonth ym = java.time.YearMonth.parse(mois);
                    LocalDateTime start = ym.atDay(1).atStartOfDay();
                    LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();
                    pointages = pointageRepository.findByAffectationAgentIdAndDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(agentId, start, end);
                } catch (Exception e) {
                    pointages = pointageRepository.findByAffectationAgentIdOrderByDateHeureEntreeDesc(agentId);
                }
            } else {
                pointages = pointageRepository.findByAffectationAgentIdOrderByDateHeureEntreeDesc(agentId);
            }
        } else {
            LocalDateTime start = (date != null ? date : LocalDate.now()).atStartOfDay();
            LocalDateTime end = start.plusDays(1);
            pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(start, end);
        }

        UUID tenantId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        for (Pointage pointage : pointages) {
            if (tenantId != null && (pointage.getEntreprise() == null || !pointage.getEntreprise().getId().equals(tenantId))) {
                continue;
            }
            response.add(toResponse(pointage));
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/dates")
    @PreAuthorize("hasAnyRole('COORDONNATEUR', 'EMPLOYEUR', 'ADMIN_ENTREPRISE')")
    public ResponseEntity<List<Map<String, Object>>> getPointageDates() {
        UUID tenantId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        if (tenantId != null) {
            return ResponseEntity.ok(toDateSummary(pointageRepository.findPointageDatesWithCountsByEntrepriseId(tenantId)));
        }
        return ResponseEntity.ok(toDateSummary(pointageRepository.findPointageDatesWithCounts()));
    }

    private ResponseEntity<List<Map<String, Object>>> getPointagesByDate(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        List<Map<String, Object>> response = new ArrayList<>();

        UUID tenantId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        for (Pointage pointage : pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(start, end)) {
            if (tenantId != null && (pointage.getEntreprise() == null || !pointage.getEntreprise().getId().equals(tenantId))) {
                continue;
            }
            response.add(toResponse(pointage));
        }
        return ResponseEntity.ok(response);
    }

    private List<Map<String, Object>> toDateSummary(List<Object[]> rows) {
        List<Map<String, Object>> response = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", row[0] != null ? row[0].toString() : null);
            map.put("total", row[1]);
            response.add(map);
        }
        return response;
    }

    private Map<String, Object> toResponse(Pointage pointage) {
        Map<String, Object> map = new LinkedHashMap<>();
        Affectation affectation = pointage.getAffectation();
        Poste poste = affectation != null ? affectation.getPoste() : null;

        map.put("id", pointage.getId());
        map.put("agentNom", resolveAgentNom(affectation));
        map.put("typePointage", pointage.getDateHeureSortie() == null ? "ENTREE" : "SORTIE");
        map.put("dateHeure", pointage.getDateHeureSortie() != null ? pointage.getDateHeureSortie() : pointage.getDateHeureEntree());
        map.put("dateHeureEntree", pointage.getDateHeureEntree());
        map.put("dateHeureSortie", pointage.getDateHeureSortie());
        map.put("mode", pointage.getMode());
        map.put("latitudeEntree", pointage.getLatitudeEntree());
        map.put("longitudeEntree", pointage.getLongitudeEntree());
        map.put("latitudeSortie", pointage.getLatitudeSortie());
        map.put("longitudeSortie", pointage.getLongitudeSortie());
        map.put("distanceParcourueKm", pointage.getDistanceParcourueKm());
        map.put("dureeMinutes", pointage.getDureeMinutes());
        map.put("anomalie", pointage.getAnomalie());
        map.put("siteNom", poste != null && poste.getSite() != null ? poste.getSite().getNom() : null);
        map.put("structureCliente", poste != null && poste.getSite() != null && poste.getSite().getStructureDemandeuse() != null ? poste.getSite().getStructureDemandeuse().getRaisonSociale() : "—");
        map.put("statut", pointage.getStatut());
        return map;
    }

    private void applyPointageExtras(Pointage pointage, Map<String, String> payload) {
        if (payload.get("mode") != null) pointage.setMode(payload.get("mode"));
        if (payload.get("anomalie") != null) pointage.setAnomalie(payload.get("anomalie"));
        if (payload.get("selfieUrl") != null) pointage.setSelfieUrl(payload.get("selfieUrl"));
        if (payload.get("identifiantNfc") != null) pointage.setIdentifiantNfc(payload.get("identifiantNfc"));
        if (payload.get("sourceBiometrie") != null) pointage.setSourceBiometrie(payload.get("sourceBiometrie"));
        if (payload.get("latitude") != null && payload.get("longitude") != null) {
            BigDecimal lat = new BigDecimal(payload.get("latitude"));
            BigDecimal lng = new BigDecimal(payload.get("longitude"));
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
    }

    private String resolveAgentNom(Affectation affectation) {
        if (affectation == null || affectation.getAgent() == null) {
            return "N/A";
        }
        return affectation.getAgent().getNom() + " " + affectation.getAgent().getPrenom();
    }

    private String safeMessage(Exception e) {
        return e.getMessage() != null ? e.getMessage() : "Erreur lors de la validation du pointage.";
    }
}
