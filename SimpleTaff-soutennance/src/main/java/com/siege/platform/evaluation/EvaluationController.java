package com.siege.platform.evaluation;
 
import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
 
import java.time.LocalDate;
import java.util.*;
 
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/evaluations")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN', 'EMPLOYEUR')")
@Transactional
public class EvaluationController {
    private final EvaluationAgentRepository evaluationRepository;
    private final AgentTerrainRepository agentRepository;
    private final CurrentTenantService tenantService;
    private final com.siege.platform.contrat.ContratAgentRepository contratRepository;
    private final com.siege.platform.poste.AffectationRepository affectationRepository;
 
    public EvaluationController(EvaluationAgentRepository evaluationRepository,
                                AgentTerrainRepository agentRepository,
                                CurrentTenantService tenantService,
                                com.siege.platform.contrat.ContratAgentRepository contratRepository,
                                com.siege.platform.poste.AffectationRepository affectationRepository) {
        this.evaluationRepository = evaluationRepository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
        this.contratRepository = contratRepository;
        this.affectationRepository = affectationRepository;
    }
 
    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(value = "agentId", required = false) UUID agentId) {
        UUID entrepriseId = tenantService.entreprise().getId();
        List<EvaluationAgent> list = agentId == null
                ? evaluationRepository.findByEntrepriseIdWithAgent(entrepriseId)
                : evaluationRepository.findByAgentIdOrderByAnneeDesc(agentId);
                
        return list.stream().map(this::evaluationToMap).toList();
    }

    private Map<String, Object> evaluationToMap(EvaluationAgent ev) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", ev.getId());
        m.put("annee", ev.getAnnee());
        m.put("dateEvaluation", ev.getDateEvaluation());
        m.put("scoreTotal", ev.getScoreTotal());
        m.put("commentaire", ev.getCommentaire());
        m.put("employeurEvaluateur", ev.getEmployeurEvaluateur() != null ? ev.getEmployeurEvaluateur() : "N/A");
        
        // Fetch structure cliente from latest affectation or contract
        String structure = "—";
        if (ev.getAgent() != null) {
            List<com.siege.platform.poste.Affectation> affectations = affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(ev.getAgent().getId());
            if (!affectations.isEmpty() && affectations.get(0).getPoste() != null && affectations.get(0).getPoste().getSite() != null && affectations.get(0).getPoste().getSite().getStructureDemandeuse() != null) {
                structure = affectations.get(0).getPoste().getSite().getStructureDemandeuse().getRaisonSociale();
            } else {
                List<com.siege.platform.contrat.ContratAgent> contracts = contratRepository.findByAgentIdOrderByDateDebutDesc(ev.getAgent().getId());
                if (!contracts.isEmpty() && contracts.get(0).getStructureCliente() != null) {
                    structure = contracts.get(0).getStructureCliente().getRaisonSociale();
                }
            }
        }
        m.put("structureCliente", structure);
        
        // Agent details
        Map<String, Object> agentMap = new LinkedHashMap<>();
        if (ev.getAgent() != null) {
            agentMap.put("id", ev.getAgent().getId());
            agentMap.put("nom", ev.getAgent().getNom());
            agentMap.put("prenom", ev.getAgent().getPrenom());
            agentMap.put("matricule", ev.getAgent().getMatricule());
        }
        m.put("agent", agentMap);
        
        return m;
    }
 
    @PostMapping
    @PreAuthorize("hasAnyRole('EMPLOYEUR', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        EvaluationAgent evaluation = new EvaluationAgent();
        evaluation.setEntreprise(tenantService.entreprise());
        
        UUID agentId;
        if (payload.get("agentId") != null) {
            agentId = UUID.fromString(payload.get("agentId").toString());
        } else if (payload.get("agent") != null && ((Map<?,?>)payload.get("agent")).get("id") != null) {
            agentId = UUID.fromString(((Map<?,?>)payload.get("agent")).get("id").toString());
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "agentId est requis"));
        }
        
        evaluation.setAgent(agentRepository.findById(agentId).orElseThrow());
        evaluation.setAnnee(Integer.parseInt(payload.getOrDefault("annee", Calendar.getInstance().get(Calendar.YEAR)).toString()));
        evaluation.setDateEvaluation(LocalDate.now());
        
        evaluation.setPonctualite(Integer.parseInt(payload.getOrDefault("ponctualite", 0).toString()));
        evaluation.setDiscipline(Integer.parseInt(payload.getOrDefault("discipline", 0).toString()));
        evaluation.setQualite(Integer.parseInt(payload.getOrDefault("qualite", 0).toString()));
        evaluation.setProductivite(Integer.parseInt(payload.getOrDefault("productivite", 0).toString()));
        evaluation.setEspritEquipe(Integer.parseInt(payload.getOrDefault("espritEquipe", 0).toString()));
        evaluation.setRespectProcedures(Integer.parseInt(payload.getOrDefault("respectProcedures", 0).toString()));
        evaluation.setSatisfactionClient(Integer.parseInt(payload.getOrDefault("satisfactionClient", 0).toString()));
        evaluation.setCommunication(Integer.parseInt(payload.getOrDefault("communication", 0).toString()));
        
        evaluation.setCommentaire((String) payload.get("commentaire"));

        if (payload.get("employeurEvaluateur") != null) {
            evaluation.setEmployeurEvaluateur((String) payload.get("employeurEvaluateur"));
        } else {
            evaluation.setEmployeurEvaluateur(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
        }
        
        evaluation.setScoreTotal(
                evaluation.getPonctualite()
                        + evaluation.getDiscipline()
                        + evaluation.getQualite()
                        + evaluation.getProductivite()
                        + evaluation.getEspritEquipe()
                        + evaluation.getRespectProcedures()
                        + evaluation.getSatisfactionClient()
                        + evaluation.getCommunication()
        );
        return ResponseEntity.ok(evaluationRepository.save(evaluation));
    }
}
