package com.siege.platform.formation;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/formations")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
public class FormationController {
    private final CertificationAgentRepository repository;
    private final AgentTerrainRepository agentRepository;
    private final CurrentTenantService tenantService;

    public FormationController(CertificationAgentRepository repository,
                               AgentTerrainRepository agentRepository,
                               CurrentTenantService tenantService) {
        this.repository = repository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
    }

    @GetMapping("/agent/{agentId}")
    public List<CertificationAgent> byAgent(@PathVariable("agentId") UUID agentId) {
        return repository.findByAgentIdOrderByDateExpirationAsc(agentId);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CertificationAgent certification) {
        certification.setEntreprise(tenantService.entreprise());
        certification.setAgent(agentRepository.findById(certification.getAgent().getId()).orElseThrow());
        return ResponseEntity.ok(repository.save(certification));
    }
}
