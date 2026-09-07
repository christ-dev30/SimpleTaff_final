package com.siege.platform.formation;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.siege.platform.common.IdempotencyManager;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/formations")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
public class FormationController {
    private final CertificationAgentRepository repository;
    private final AgentTerrainRepository agentRepository;
    private final CurrentTenantService tenantService;
    private final IdempotencyManager idempotencyManager;

    public FormationController(CertificationAgentRepository repository,
                               AgentTerrainRepository agentRepository,
                               CurrentTenantService tenantService,
                               IdempotencyManager idempotencyManager) {
        this.repository = repository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
        this.idempotencyManager = idempotencyManager;
    }

    @GetMapping("/agent/{agentId}")
    public List<CertificationAgent> byAgent(@PathVariable("agentId") UUID agentId) {
        return repository.findByAgentIdOrderByDateExpirationAsc(agentId);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
                                    @RequestBody CertificationAgent certification) {
        String idempotencyKey = idempotencyHeader;
        if (idempotencyKey != null && !idempotencyKey.isBlank() && idempotencyManager.has(idempotencyKey)) {
            return ResponseEntity.ok(idempotencyManager.get(idempotencyKey));
        }

        certification.setEntreprise(tenantService.entreprise());
        certification.setAgent(agentRepository.findById(certification.getAgent().getId()).orElseThrow());
        CertificationAgent saved = repository.save(certification);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyManager.put(idempotencyKey, saved);
        }
        return ResponseEntity.ok(saved);
    }
}
