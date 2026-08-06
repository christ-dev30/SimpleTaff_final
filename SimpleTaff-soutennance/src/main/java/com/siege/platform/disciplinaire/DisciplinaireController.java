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

    private final com.siege.platform.contrat.ContratAgentRepository contratRepository;
    private final com.siege.platform.poste.AffectationRepository affectationRepository;

    public DisciplinaireController(SanctionRepository sanctionRepository,
                                   AgentTerrainRepository agentRepository,
                                   CurrentTenantService tenantService,
                                   com.siege.platform.contrat.ContratAgentRepository contratRepository,
                                   com.siege.platform.poste.AffectationRepository affectationRepository) {
        this.sanctionRepository = sanctionRepository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
        this.contratRepository = contratRepository;
        this.affectationRepository = affectationRepository;
    }

    @GetMapping("/sanctions")
    public List<Map<String, Object>> list(@RequestParam(value = "agentId", required = false) UUID agentId) {
        List<Sanction> sanctions = agentId == null ? sanctionRepository.findAll() : sanctionRepository.findByAgentIdOrderByDateDecisionDesc(agentId);
        return sanctions.stream().map(this::sanctionToMap).toList();
    }

    private Map<String, Object> sanctionToMap(Sanction s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("type", s.getType());
        m.put("motif", s.getMotif());
        m.put("decisionUrl", s.getDecisionUrl());
        m.put("dateDecision", s.getDateDecision());
        m.put("dateFin", s.getDateFin());
        m.put("clientFinal", s.getClientFinal());
        m.put("coordonnateurRemonte", s.getCoordonnateurRemonte());
        m.put("statut", s.getStatut());

        String structure = "—";
        if (s.getAgent() != null) {
            List<com.siege.platform.poste.Affectation> affectations = affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(s.getAgent().getId());
            if (!affectations.isEmpty() && affectations.get(0).getPoste() != null && affectations.get(0).getPoste().getSite() != null && affectations.get(0).getPoste().getSite().getStructureDemandeuse() != null) {
                structure = affectations.get(0).getPoste().getSite().getStructureDemandeuse().getRaisonSociale();
            } else {
                List<com.siege.platform.contrat.ContratAgent> contracts = contratRepository.findByAgentIdOrderByDateDebutDesc(s.getAgent().getId());
                if (!contracts.isEmpty() && contracts.get(0).getStructureCliente() != null) {
                    structure = contracts.get(0).getStructureCliente().getRaisonSociale();
                }
            }
        }
        m.put("structureCliente", structure);

        // Site name from affectation
        String siteNom = "—";
        if (s.getAgent() != null) {
            List<com.siege.platform.poste.Affectation> siteAffs = affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(s.getAgent().getId());
            if (!siteAffs.isEmpty() && siteAffs.get(0).getPoste() != null && siteAffs.get(0).getPoste().getSite() != null) {
                siteNom = siteAffs.get(0).getPoste().getSite().getNom();
            }
        }
        m.put("siteNom", siteNom);

        Map<String, Object> agentMap = new LinkedHashMap<>();
        if (s.getAgent() != null) {
            agentMap.put("id", s.getAgent().getId());
            agentMap.put("nom", s.getAgent().getNom());
            agentMap.put("prenom", s.getAgent().getPrenom());
        }
        m.put("agent", agentMap);

        return m;
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
