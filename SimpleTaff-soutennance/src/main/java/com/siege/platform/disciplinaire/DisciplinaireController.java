package com.siege.platform.disciplinaire;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/disciplinaire")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN', 'EMPLOYEUR', 'COORDONNATEUR')")
@Transactional
public class DisciplinaireController {
    private final SanctionRepository sanctionRepository;
    private final AgentTerrainRepository agentRepository;
    private final CurrentTenantService tenantService;

    public DisciplinaireController(SanctionRepository sanctionRepository,
                                   AgentTerrainRepository agentRepository,
                                   CurrentTenantService tenantService) {
        this.sanctionRepository = sanctionRepository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
    }

    @GetMapping("/sanctions")
    public List<Sanction> list(@RequestParam(value = "agentId", required = false) UUID agentId) {
        return agentId == null ? sanctionRepository.findAll() : sanctionRepository.findByAgentIdOrderByDateDecisionDesc(agentId);
    }

    @PostMapping("/sanctions")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        Sanction sanction = new Sanction();
        sanction.setEntreprise(tenantService.entreprise());
        sanction.setAgent(agentRepository.findById(UUID.fromString((String) payload.get("agentId"))).orElseThrow());
        sanction.setType((String) payload.get("type"));
        sanction.setMotif((String) payload.get("motif"));
        sanction.setDecisionUrl((String) payload.get("decisionUrl"));
        if (payload.get("dateFin") != null && !payload.get("dateFin").toString().isBlank()) {
            sanction.setDateFin(LocalDate.parse(payload.get("dateFin").toString()));
        }
        if (payload.get("clientFinal") != null) {
            sanction.setClientFinal((String) payload.get("clientFinal"));
        }
        if (payload.get("coordonnateurRemonte") != null) {
            sanction.setCoordonnateurRemonte((String) payload.get("coordonnateurRemonte"));
        }
        return ResponseEntity.ok(sanctionRepository.save(sanction));
    }

    @GetMapping("/agents/{agentId}/alerte")
    public Map<String, Object> alerteAgent(@PathVariable("agentId") UUID agentId) {
        return Map.of("sanctionEnCours", sanctionRepository.existsByAgentIdAndStatut(agentId, "EN_COURS"));
    }
}
