package com.siege.platform.prime;

import com.siege.platform.common.CurrentTenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/primes")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class PrimeController {
    private final ReglePrimeRendementRepository repository;
    private final CurrentTenantService tenantService;

    public PrimeController(ReglePrimeRendementRepository repository, CurrentTenantService tenantService) {
        this.repository = repository;
        this.tenantService = tenantService;
    }

    @GetMapping("/rendement/regles")
    public List<ReglePrimeRendement> regles() {
        return repository.findAll();
    }

    @PostMapping("/rendement/regles")
    public ResponseEntity<?> save(@RequestBody ReglePrimeRendement regle) {
        regle.setEntreprise(tenantService.entreprise());
        return ResponseEntity.ok(repository.save(regle));
    }

    @PostMapping("/rendement/simuler")
    public Map<String, Object> simuler(@RequestBody Map<String, Object> payload) {
        BigDecimal montantParPoint = new BigDecimal(payload.getOrDefault("montantParPoint", "0").toString());
        int score = Integer.parseInt(payload.getOrDefault("score", "0").toString());
        int seuilMinimum = Integer.parseInt(payload.getOrDefault("seuilMinimum", "0").toString());
        
        // Find matching active rules from DB for current tenant
        List<ReglePrimeRendement> regles = repository.findAll();
        ReglePrimeRendement regleAppliquee = null;
        for (ReglePrimeRendement r : regles) {
            if ("ACTIF".equalsIgnoreCase(r.getStatut()) && score >= r.getSeuilMinimum()) {
                if (regleAppliquee == null || r.getSeuilMinimum() > regleAppliquee.getSeuilMinimum()) {
                    regleAppliquee = r;
                }
            }
        }

        if (regleAppliquee != null) {
            if (montantParPoint.compareTo(BigDecimal.ZERO) == 0) {
                montantParPoint = regleAppliquee.getMontantParPoint();
            }
            if (seuilMinimum == 0) {
                seuilMinimum = regleAppliquee.getSeuilMinimum();
            }
        }

        BigDecimal montantCalcule = BigDecimal.ZERO;
        if (score >= seuilMinimum) {
            montantCalcule = montantParPoint.multiply(BigDecimal.valueOf(score));
        }

        return Map.of(
            "score", score,
            "seuilMinimumApplique", seuilMinimum,
            "montantParPointApplique", montantParPoint,
            "montantCalcule", montantCalcule,
            "regleAssociee", regleAppliquee != null ? regleAppliquee.getLibelle() : "Aucune règle spécifique"
        );
    }
}
