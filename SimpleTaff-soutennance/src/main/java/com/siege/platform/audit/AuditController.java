package com.siege.platform.audit;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class AuditController {
    private final AuditLogRepository repository;

    public AuditController(AuditLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<AuditLog> list(@RequestParam(value = "dateDebut", required = false) LocalDate dateDebut,
                               @RequestParam(value = "dateFin", required = false) LocalDate dateFin) {
        LocalDate debut = dateDebut != null ? dateDebut : LocalDate.now().minusDays(30);
        LocalDate fin = dateFin != null ? dateFin : LocalDate.now();
        return repository.findByCreeLeBetweenOrderByCreeLeDesc(debut.atStartOfDay(), fin.plusDays(1).atStartOfDay());
    }
    @DeleteMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public org.springframework.http.ResponseEntity<?> clearAudit() {
        try {
            repository.deleteAll();
            return org.springframework.http.ResponseEntity.ok(java.util.Map.of("message", "Journal d'audit vidé avec succès."));
        } catch (Exception e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("message", "Erreur lors de la suppression de l'audit."));
        }
    }
}
