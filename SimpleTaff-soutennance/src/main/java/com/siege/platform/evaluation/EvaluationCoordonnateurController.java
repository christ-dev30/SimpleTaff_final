package com.siege.platform.evaluation;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.utilisateur.UtilisateurRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/evaluations-coordonnateur")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
@Transactional
public class EvaluationCoordonnateurController {
    private final EvaluationCoordonnateurRepository evaluationRepository;
    private final AgentTerrainRepository agentRepository;
    private final CurrentTenantService tenantService;
    private final com.siege.platform.contrat.ContratAgentRepository contratRepository;
    private final com.siege.platform.poste.AffectationRepository affectationRepository;
    private final UtilisateurRepository utilisateurRepository;

    public EvaluationCoordonnateurController(EvaluationCoordonnateurRepository evaluationRepository,
                                              AgentTerrainRepository agentRepository,
                                              CurrentTenantService tenantService,
                                              com.siege.platform.contrat.ContratAgentRepository contratRepository,
                                              com.siege.platform.poste.AffectationRepository affectationRepository,
                                              UtilisateurRepository utilisateurRepository) {
        this.evaluationRepository = evaluationRepository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
        this.contratRepository = contratRepository;
        this.affectationRepository = affectationRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(value = "agentId", required = false) UUID agentId) {
        UUID entrepriseId = tenantService.entreprise().getId();
        List<EvaluationCoordonnateur> list = agentId == null
                ? evaluationRepository.findByEntrepriseIdWithAgent(entrepriseId)
                : evaluationRepository.findByAgentIdOrderByAnneeDesc(agentId);

        return list.stream().map(this::evaluationToMap).toList();
    }

    private Map<String, Object> evaluationToMap(EvaluationCoordonnateur ev) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", ev.getId());
        m.put("annee", ev.getAnnee());
        m.put("dateEvaluation", ev.getDateEvaluation());
        m.put("scoreTotal", ev.getScoreTotal());
        m.put("commentaire", ev.getCommentaire());

        String evaluateurName = ev.getCoordonnateurEvaluateur() != null ? ev.getCoordonnateurEvaluateur() : "N/A";
        if (ev.getCoordonnateurEvaluateur() != null && !ev.getCoordonnateurEvaluateur().isBlank()) {
            com.siege.platform.utilisateur.Utilisateur u = utilisateurRepository.findByEmail(ev.getCoordonnateurEvaluateur()).orElse(null);
            if (u != null) {
                String nom = u.getNom() != null ? u.getNom() : "";
                String prenom = u.getPrenom() != null ? u.getPrenom() : "";
                if (!nom.isBlank() || !prenom.isBlank()) {
                    evaluateurName = (nom + " " + prenom).trim();
                }
            }
        }
        m.put("coordonnateurEvaluateur", evaluateurName);

        m.put("reactiviteAffectations", ev.getReactiviteAffectations());
        m.put("mobiliteInterSites", ev.getMobiliteInterSites());
        m.put("conformiteAdministrative", ev.getConformiteAdministrative());
        m.put("relationnelEquipe", ev.getRelationnelEquipe());
        m.put("autonomieTerrain", ev.getAutonomieTerrain());
        m.put("historiqueDisciplinaire", ev.getHistoriqueDisciplinaire());

        // Fetch structure cliente / site from latest affectation ou contrat
        String structure = "—";
        String siteNom = "—";
        if (ev.getAgent() != null) {
            List<com.siege.platform.poste.Affectation> affectations = affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(ev.getAgent().getId());
            if (!affectations.isEmpty() && affectations.get(0).getPoste() != null && affectations.get(0).getPoste().getSite() != null) {
                siteNom = affectations.get(0).getPoste().getSite().getNom();
                if (affectations.get(0).getPoste().getSite().getStructureDemandeuse() != null) {
                    structure = affectations.get(0).getPoste().getSite().getStructureDemandeuse().getRaisonSociale();
                }
            } else {
                List<com.siege.platform.contrat.ContratAgent> contracts = contratRepository.findByAgentIdOrderByDateDebutDesc(ev.getAgent().getId());
                if (!contracts.isEmpty() && contracts.get(0).getStructureCliente() != null) {
                    structure = contracts.get(0).getStructureCliente().getRaisonSociale();
                }
            }
        }
        m.put("structureCliente", structure);
        m.put("siteNom", siteNom);

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
    @PreAuthorize("hasAnyRole('COORDONNATEUR', 'SUPER_ADMIN')")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        EvaluationCoordonnateur evaluation = new EvaluationCoordonnateur();
        evaluation.setEntreprise(tenantService.entreprise());

        UUID agentId;
        if (payload.get("agentId") != null) {
            agentId = UUID.fromString(payload.get("agentId").toString());
        } else if (payload.get("agent") != null && ((Map<?, ?>) payload.get("agent")).get("id") != null) {
            agentId = UUID.fromString(((Map<?, ?>) payload.get("agent")).get("id").toString());
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "agentId est requis"));
        }

        evaluation.setAgent(agentRepository.findById(agentId).orElseThrow());
        evaluation.setAnnee(Integer.parseInt(payload.getOrDefault("annee", Calendar.getInstance().get(Calendar.YEAR)).toString()));
        evaluation.setDateEvaluation(LocalDate.now());

        evaluation.setReactiviteAffectations(Integer.parseInt(payload.getOrDefault("reactiviteAffectations", 0).toString()));
        evaluation.setMobiliteInterSites(Integer.parseInt(payload.getOrDefault("mobiliteInterSites", 0).toString()));
        evaluation.setConformiteAdministrative(Integer.parseInt(payload.getOrDefault("conformiteAdministrative", 0).toString()));
        evaluation.setRelationnelEquipe(Integer.parseInt(payload.getOrDefault("relationnelEquipe", 0).toString()));
        evaluation.setAutonomieTerrain(Integer.parseInt(payload.getOrDefault("autonomieTerrain", 0).toString()));
        evaluation.setHistoriqueDisciplinaire(Integer.parseInt(payload.getOrDefault("historiqueDisciplinaire", 0).toString()));

        evaluation.setCommentaire((String) payload.get("commentaire"));
        evaluation.setCoordonnateurEvaluateur(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());

        evaluation.setScoreTotal(
                evaluation.getReactiviteAffectations()
                        + evaluation.getMobiliteInterSites()
                        + evaluation.getConformiteAdministrative()
                        + evaluation.getRelationnelEquipe()
                        + evaluation.getAutonomieTerrain()
                        + evaluation.getHistoriqueDisciplinaire()
        );
        return ResponseEntity.ok(evaluationToMap(evaluationRepository.save(evaluation)));
    }
}
