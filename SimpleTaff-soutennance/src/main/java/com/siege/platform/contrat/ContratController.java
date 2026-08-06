package com.siege.platform.contrat;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.structuredemandeuse.StructureDemandeuseRepository;
import com.siege.platform.audit.AuditLog;
import com.siege.platform.audit.AuditLogRepository;
import com.siege.platform.notification.NotificationService;
import com.siege.platform.poste.AffectationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import com.siege.platform.common.IdempotencyManager;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/contrats")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
public class ContratController {

    private final ContratAgentRepository contratRepository;
    private final RenouvellementContratRepository renouvellementRepository;
    private final AgentTerrainRepository agentRepository;
    private final StructureDemandeuseRepository structureRepository;
    private final CurrentTenantService tenantService;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final IdempotencyManager idempotencyManager;
    private final AffectationRepository affectationRepository;

    public ContratController(ContratAgentRepository contratRepository,
                             RenouvellementContratRepository renouvellementRepository,
                             AgentTerrainRepository agentRepository,
                             StructureDemandeuseRepository structureRepository,
                             AffectationRepository affectationRepository,
                             CurrentTenantService tenantService,
                             AuditLogRepository auditLogRepository,
                             NotificationService notificationService,
                             IdempotencyManager idempotencyManager) {
        this.contratRepository = contratRepository;
        this.renouvellementRepository = renouvellementRepository;
        this.agentRepository = agentRepository;
        this.structureRepository = structureRepository;
        this.affectationRepository = affectationRepository;
        this.tenantService = tenantService;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
        this.idempotencyManager = idempotencyManager;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return contratRepository.findAll().stream().map(this::toMap).toList();
    }

    @GetMapping("/agent/{agentId}")
    public List<Map<String, Object>> byAgent(@PathVariable("agentId") UUID agentId) {
        return contratRepository.findByAgentIdOrderByDateDebutDesc(agentId).stream().map(this::toMap).toList();
    }

    @GetMapping("/expirations")
    public List<Map<String, Object>> expirations(@RequestParam(value = "jours", defaultValue = "30") int jours) {
        return contratRepository.findByDateFinBetweenAndStatut(LocalDate.now(), LocalDate.now().plusDays(jours), "ACTIF")
                .stream().map(this::toMap).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
                                    @RequestBody Map<String, Object> payload) {
        String idempotencyKey = idempotencyHeader != null ? idempotencyHeader : (String) payload.get("idempotencyKey");
        if (idempotencyKey != null && !idempotencyKey.isBlank() && idempotencyManager.has(idempotencyKey)) {
            return ResponseEntity.ok(idempotencyManager.get(idempotencyKey));
        }

        ContratAgent contrat = new ContratAgent();
        contrat.setEntreprise(tenantService.entreprise());
        contrat.setAgent(agentRepository.findById(UUID.fromString((String) payload.get("agentId"))).orElseThrow());
        contrat.setType((String) payload.get("type"));
        if (payload.get("dateDebut") != null && !payload.get("dateDebut").toString().isBlank()) {
            contrat.setDateDebut(LocalDate.parse((String) payload.get("dateDebut")));
        } else {
            contrat.setDateDebut(LocalDate.now());
        }
        if (payload.get("dateFin") != null && !payload.get("dateFin").toString().isBlank()) {
            contrat.setDateFin(LocalDate.parse((String) payload.get("dateFin")));
        }
        if (payload.get("structureClienteId") != null && !payload.get("structureClienteId").toString().isBlank()) {
            contrat.setStructureCliente(structureRepository.findById(UUID.fromString((String) payload.get("structureClienteId"))).orElse(null));
        }
        contrat.setDirection((String) payload.get("direction"));
        contrat.setDocumentUrl((String) payload.get("documentUrl"));
        
        String reqStatut = (String) payload.getOrDefault("statut", "ACTIF");
        contrat.setStatut(reqStatut);

        // Map new fields
        if (payload.get("salaireBase") != null) {
            contrat.setSalaireBase(new java.math.BigDecimal(payload.get("salaireBase").toString()));
        }
        contrat.setFonction((String) payload.get("fonction"));
        contrat.setDepartement((String) payload.get("departement"));

        ContratAgent saved = contratRepository.save(contrat);

        // Update Agent status only if contract is ACTIF
        com.siege.platform.agent.AgentTerrain ag = saved.getAgent();
        if (ag != null) {
            if ("ACTIF".equalsIgnoreCase(reqStatut)) {
                ag.setStatut("ACTIF");
            } else {
                ag.setStatut("EN_ATTENTE_CONTRAT_SIGNE");
            }
            agentRepository.save(ag);
        }

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setEntreprise(saved.getEntreprise());
        audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
        audit.setAction("CREATION_CONTRAT");
        audit.setModule("RH_CONTRAT");
        audit.setCibleId(saved.getId().toString());
        audit.setDetails("Création du contrat de type " + saved.getType() + " pour l'agent : " + saved.getAgent().getNom() + " " + saved.getAgent().getPrenom());
        auditLogRepository.save(audit);

        // Notification
        notificationService.creerAlerte(saved.getEntreprise(), "RH_CONTRAT", "Nouveau contrat de type " + saved.getType() + " créé pour l'agent " + saved.getAgent().getNom() + " " + saved.getAgent().getPrenom());

        Map<String, Object> responseBody = toMap(saved);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyManager.put(idempotencyKey, responseBody);
        }
        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/{id}/finaliser")
    @Transactional
    public ResponseEntity<?> finaliserContrat(@PathVariable("id") UUID id, @RequestBody Map<String, Object> payload) {
        ContratAgent contrat = contratRepository.findById(id).orElseThrow();
        
        String dateDebutStr = (String) payload.get("dateDebut");
        String dateFinStr = (String) payload.get("dateFin");
        String documentUrl = (String) payload.get("documentUrl");
        
        if (dateDebutStr == null || dateDebutStr.isBlank() || documentUrl == null || documentUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Date de début et document signés requis."));
        }
        
        contrat.setDateDebut(LocalDate.parse(dateDebutStr));
        if (dateFinStr != null && !dateFinStr.isBlank()) {
            contrat.setDateFin(LocalDate.parse(dateFinStr));
        }
        contrat.setDocumentUrl(documentUrl);
        contrat.setStatut("ACTIF");
        
        ContratAgent saved = contratRepository.save(contrat);
        
        com.siege.platform.agent.AgentTerrain ag = saved.getAgent();
        if (ag != null) {
            ag.setStatut("ACTIF");
            agentRepository.save(ag);
        }
        
        AuditLog audit = new AuditLog();
        audit.setEntreprise(saved.getEntreprise());
        audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
        audit.setAction("FINALISATION_CONTRAT");
        audit.setModule("RH_CONTRAT");
        audit.setCibleId(saved.getId().toString());
        audit.setDetails("Finalisation et activation du contrat pour l'agent : " + (ag != null ? ag.getNom() + " " + ag.getPrenom() : "inconnu"));
        auditLogRepository.save(audit);
        
        notificationService.creerAlerte(saved.getEntreprise(), "RH_CONTRAT", "Le contrat de l'agent " + (ag != null ? ag.getNom() + " " + ag.getPrenom() : "inconnu") + " a été finalisé et signé.");
        
        Map<String, Object> responseBody = toMap(saved);
        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/{id}/renouvellements")
    public ResponseEntity<?> renouveler(@PathVariable("id") UUID id, @RequestBody Map<String, Object> payload) {
        ContratAgent contrat = contratRepository.findById(id).orElseThrow();
        
        // Validation d'éligibilité : CDD renouvelable max 2 fois
        int renewalsCount = renouvellementRepository.findByContratIdOrderByCreeLeDesc(id).size();
        if ("CDD".equalsIgnoreCase(contrat.getType()) && renewalsCount >= 2) {
            return ResponseEntity.badRequest().body(Map.of("message", "Conformément à la réglementation locale, un contrat CDD ne peut pas être renouvelé plus de 2 fois."));
        }

        RenouvellementContrat renouvellement = new RenouvellementContrat();
        renouvellement.setContrat(contrat);
        renouvellement.setAncienneDateFin(contrat.getDateFin());
        renouvellement.setNouvelleDateFin(LocalDate.parse((String) payload.get("nouvelleDateFin")));
        renouvellement.setMotif((String) payload.get("motif"));
        renouvellement.setDocumentUrl((String) payload.get("documentUrl"));
        
        contrat.setDateFin(renouvellement.getNouvelleDateFin());
        
        renouvellementRepository.save(renouvellement);
        contratRepository.save(contrat);

        // Audit log
        AuditLog audit = new AuditLog();
        audit.setEntreprise(contrat.getEntreprise());
        audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
        audit.setAction("RENOUVELLEMENT_CONTRAT");
        audit.setModule("RH_CONTRAT");
        audit.setCibleId(contrat.getId().toString());
        audit.setDetails("Renouvellement de contrat pour l'agent : " + contrat.getAgent().getNom() + " " + contrat.getAgent().getPrenom() + ". Nouvelle date fin: " + renouvellement.getNouvelleDateFin());
        auditLogRepository.save(audit);

        // Notification
        notificationService.creerAlerte(contrat.getEntreprise(), "RH_CONTRAT", "Contrat de l'agent " + contrat.getAgent().getNom() + " " + contrat.getAgent().getPrenom() + " renouvelé jusqu'au " + renouvellement.getNouvelleDateFin());

        return ResponseEntity.ok(Map.of("message", "Contrat renouvele."));
    }

    @GetMapping("/{id}/renouvellements")
    public ResponseEntity<List<RenouvellementContrat>> getRenouvellements(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(renouvellementRepository.findByContratIdOrderByCreeLeDesc(id));
    }

    private Map<String, Object> toMap(ContratAgent c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("agentId", c.getAgent() != null ? c.getAgent().getId() : null);
        m.put("agentNom", c.getAgent() != null ? c.getAgent().getNom() + " " + c.getAgent().getPrenom() : null);
        m.put("type", c.getType());
        m.put("dateDebut", c.getDateDebut());
        m.put("dateFin", c.getDateFin());
        // Structure cliente = the StructureDemandeuse to which the agent is assigned via affectation
        String structureClienteNom = null;
        if (c.getStructureCliente() != null) {
            structureClienteNom = c.getStructureCliente().getRaisonSociale();
        } else if (c.getAgent() != null) {
            // Fallback: resolve from the agent's active (or most recent) affectation
            List<com.siege.platform.poste.Affectation> affs =
                affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(c.getAgent().getId());
            com.siege.platform.poste.Affectation aff = affs.stream()
                .filter(a -> "ACTIVE".equalsIgnoreCase(a.getStatut()))
                .findFirst()
                .orElse(affs.isEmpty() ? null : affs.get(0));
            if (aff != null && aff.getPoste() != null
                    && aff.getPoste().getSite() != null
                    && aff.getPoste().getSite().getStructureDemandeuse() != null) {
                structureClienteNom = aff.getPoste().getSite().getStructureDemandeuse().getRaisonSociale();
            }
        }
        m.put("structureCliente", structureClienteNom);
        // Site name from affectation
        String siteNom = null;
        if (c.getAgent() != null) {
            List<com.siege.platform.poste.Affectation> siteAffs =
                affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(c.getAgent().getId());
            com.siege.platform.poste.Affectation siteAff = siteAffs.stream()
                .filter(a -> "ACTIVE".equalsIgnoreCase(a.getStatut()))
                .findFirst()
                .orElse(siteAffs.isEmpty() ? null : siteAffs.get(0));
            if (siteAff != null && siteAff.getPoste() != null && siteAff.getPoste().getSite() != null) {
                siteNom = siteAff.getPoste().getSite().getNom();
            }
        }
        m.put("siteNom", siteNom);
        m.put("direction", c.getDirection());
        m.put("statut", c.getStatut());
        m.put("salaireBase", c.getSalaireBase());
        m.put("fonction", c.getFonction());
        m.put("departement", c.getDepartement());
        m.put("documentUrl", c.getDocumentUrl());
        return m;
    }
}
