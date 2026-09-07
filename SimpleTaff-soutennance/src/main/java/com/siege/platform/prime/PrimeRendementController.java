package com.siege.platform.prime;

import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.entreprise.Entreprise;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/primes/rendement")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class PrimeRendementController {

    private final ReglePrimeRendementRepository repository;
    private final CurrentTenantService tenantService;

    public PrimeRendementController(ReglePrimeRendementRepository repository, CurrentTenantService tenantService) {
        this.repository = repository;
        this.tenantService = tenantService;
    }

    @GetMapping("/regles")
    public ResponseEntity<List<Map<String, Object>>> listRegles() {
        Entreprise entreprise = tenantService.entreprise();
        List<Map<String, Object>> response = repository
                .findByEntrepriseIdAndStatutOrderBySeuilMinimumAsc(entreprise.getId(), "ACTIF")
                .stream().map(this::toMap).toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/regles")
    public ResponseEntity<?> creerRegle(@RequestBody Map<String, Object> payload) {
        String libelle = payload.get("libelle") != null ? payload.get("libelle").toString().trim() : "";
        if (libelle.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Libellé de la règle requis."));
        }
        Entreprise entreprise = tenantService.entreprise();

        ReglePrimeRendement regle = new ReglePrimeRendement();
        regle.setEntreprise(entreprise);
        regle.setLibelle(libelle);
        regle.setMontantParPoint(parseBigDecimalOrZero(payload.get("montantParPoint")));
        regle.setSeuilMinimum(parseIntOrZero(payload.get("seuilMinimum")));
        regle.setStatut(payload.get("statut") != null ? payload.get("statut").toString() : "ACTIF");

        ReglePrimeRendement saved = repository.save(regle);
        return ResponseEntity.ok(toMap(saved));
    }

    @PostMapping("/simuler")
    public ResponseEntity<?> simuler(@RequestBody Map<String, Object> payload) {
        Entreprise entreprise = tenantService.entreprise();
        int score = parseIntOrZero(payload.get("score"));

        BigDecimal montantParPointOverride = parseBigDecimalOrZero(payload.get("montantParPoint"));
        int seuilMinimumOverride = parseIntOrZero(payload.get("seuilMinimum"));

        String regleAssociee;
        BigDecimal montantParPointApplique;
        int seuilMinimumApplique;

        if (montantParPointOverride.compareTo(BigDecimal.ZERO) > 0) {
            regleAssociee = "Simulation manuelle";
            montantParPointApplique = montantParPointOverride;
            seuilMinimumApplique = seuilMinimumOverride;
        } else {
            List<ReglePrimeRendement> regles = repository
                    .findByEntrepriseIdAndStatutOrderBySeuilMinimumAsc(entreprise.getId(), "ACTIF");
            ReglePrimeRendement meilleure = null;
            for (ReglePrimeRendement r : regles) {
                if (score >= r.getSeuilMinimum()) {
                    meilleure = r;
                }
            }
            if (meilleure != null) {
                regleAssociee = meilleure.getLibelle();
                montantParPointApplique = meilleure.getMontantParPoint();
                seuilMinimumApplique = meilleure.getSeuilMinimum();
            } else {
                regleAssociee = "Aucune règle applicable";
                montantParPointApplique = BigDecimal.ZERO;
                seuilMinimumApplique = 0;
            }
        }

        BigDecimal montantCalcule = score >= seuilMinimumApplique
                ? montantParPointApplique.multiply(BigDecimal.valueOf(score))
                : BigDecimal.ZERO;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("regleAssociee", regleAssociee);
        result.put("seuilMinimumApplique", seuilMinimumApplique);
        result.put("montantParPointApplique", montantParPointApplique);
        result.put("montantCalcule", montantCalcule);
        return ResponseEntity.ok(result);
    }

    private BigDecimal parseBigDecimalOrZero(Object raw) {
        if (raw == null || raw.toString().isBlank()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(raw.toString());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }

    private int parseIntOrZero(Object raw) {
        if (raw == null || raw.toString().isBlank()) return 0;
        try {
            return (int) Double.parseDouble(raw.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private Map<String, Object> toMap(ReglePrimeRendement r) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", r.getId());
        map.put("libelle", r.getLibelle());
        map.put("montantParPoint", r.getMontantParPoint());
        map.put("seuilMinimum", r.getSeuilMinimum());
        map.put("statut", r.getStatut());
        return map;
    }
}
