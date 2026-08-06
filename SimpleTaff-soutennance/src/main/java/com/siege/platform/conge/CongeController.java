package com.siege.platform.conge;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.audit.AuditLog;
import com.siege.platform.audit.AuditLogRepository;
import com.siege.platform.notification.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/conges")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
@Transactional
public class CongeController {
    private final DemandeCongeRepository demandeRepository;
    private final SoldeCongeRepository soldeRepository;
    private final AgentTerrainRepository agentRepository;
    private final CurrentTenantService tenantService;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final com.siege.platform.poste.AffectationRepository affectationRepository;

    public CongeController(DemandeCongeRepository demandeRepository,
                           SoldeCongeRepository soldeRepository,
                           AgentTerrainRepository agentRepository,
                           CurrentTenantService tenantService,
                           AuditLogRepository auditLogRepository,
                           NotificationService notificationService,
                           com.siege.platform.poste.AffectationRepository affectationRepository) {
        this.demandeRepository = demandeRepository;
        this.soldeRepository = soldeRepository;
        this.agentRepository = agentRepository;
        this.tenantService = tenantService;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
        this.affectationRepository = affectationRepository;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(value = "agentId", required = false) UUID agentId) {
        List<DemandeConge> conges = agentId == null ? demandeRepository.findAll() : demandeRepository.findByAgentIdOrderByDateDebutDesc(agentId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (DemandeConge c : conges) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("type", c.getType());
            map.put("dateDebut", c.getDateDebut());
            map.put("dateFin", c.getDateFin());
            map.put("motif", c.getMotif());
            map.put("justifUrl", c.getJustificatifUrl());
            map.put("statut", c.getStatut());
            
            if (c.getAgent() != null) {
                Map<String, Object> agentMap = new HashMap<>();
                agentMap.put("id", c.getAgent().getId());
                agentMap.put("nom", c.getAgent().getNom());
                agentMap.put("prenom", c.getAgent().getPrenom());
                map.put("agent", agentMap);
                
                com.siege.platform.poste.Affectation activeAff = affectationRepository.findByAgentIdAndStatut(c.getAgent().getId(), "ACTIVE").orElse(null);
                if (activeAff != null && activeAff.getPoste() != null) {
                    map.put("posteOccupe", activeAff.getPoste().getEmploi() != null ? activeAff.getPoste().getEmploi().getLibelle() : "—");
                    if (activeAff.getPoste().getSite() != null && activeAff.getPoste().getSite().getStructureDemandeuse() != null) {
                        map.put("structureCliente", activeAff.getPoste().getSite().getStructureDemandeuse().getRaisonSociale());
                    }
                }
            }
            result.add(map);
        }
        return result;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        DemandeConge demande = new DemandeConge();
        demande.setEntreprise(tenantService.entreprise());
        demande.setAgent(agentRepository.findById(UUID.fromString((String) payload.get("agentId"))).orElseThrow());
        demande.setType((String) payload.get("type"));
        demande.setDateDebut(LocalDate.parse((String) payload.get("dateDebut")));
        demande.setDateFin(LocalDate.parse((String) payload.get("dateFin")));
        demande.setMotif((String) payload.get("motif"));
        demande.setJustificatifUrl((String) payload.get("justificatifUrl"));
        if (!"ABSENCE_INJUSTIFIEE".equals(demande.getType())) {
            demande.setStatut("EN_ATTENTE_RH");
        } else {
            demande.setStatut("EN_ATTENTE_SUPERVISEUR");
        }
        
        DemandeConge saved = demandeRepository.save(demande);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntreprise(saved.getEntreprise());
        audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
        audit.setAction("CREATION_DEMANDE_CONGE");
        audit.setModule("RH_CONGE");
        audit.setCibleId(saved.getId().toString());
        audit.setDetails("Création d'une demande d'absence/congé (" + saved.getType() + ") pour l'agent : " + saved.getAgent().getNom() + " " + saved.getAgent().getPrenom());
        auditLogRepository.save(audit);

        // Notification
        notificationService.creerAlerte(saved.getEntreprise(), "RH_CONGE", "Nouvelle demande de congé (" + saved.getType() + ") créée pour l'agent " + saved.getAgent().getNom() + " " + saved.getAgent().getPrenom());

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{id}/valider")
    public ResponseEntity<?> valider(@PathVariable("id") UUID id, @RequestParam("etape") String etape) {
        DemandeConge demande = demandeRepository.findById(id).orElseThrow();
        if ("SUPERVISEUR".equalsIgnoreCase(etape)) {
            demande.setStatut("EN_ATTENTE_RH");
        } else if ("RH".equalsIgnoreCase(etape)) {
            demande.setStatut("EN_ATTENTE_DIRECTION");
        } else if ("DIRECTION".equalsIgnoreCase(etape)) {
            demande.setStatut("VALIDEE");
            // Mettre à jour le solde si c'est un congé annuel
            if ("ANNUEL".equalsIgnoreCase(demande.getType())) {
                int joursConge = jours(demande);
                int annee = demande.getDateDebut().getYear();
                SoldeConge solde = soldeRepository.findByAgentIdAndAnnee(demande.getAgent().getId(), annee).orElseGet(() -> {
                    SoldeConge s = new SoldeConge();
                    s.setEntreprise(demande.getEntreprise());
                    s.setAgent(demande.getAgent());
                    s.setAnnee(annee);
                    s.setSoldeTotal(30);
                    s.setJoursConsommes(0);
                    s.setJoursRestants(30);
                    return s;
                });
                solde.setJoursConsommes(solde.getJoursConsommes() + joursConge);
                solde.setJoursRestants(solde.getSoldeTotal() - solde.getJoursConsommes());
                soldeRepository.save(solde);
            }
        } else if ("REFUSER".equalsIgnoreCase(etape)) {
            demande.setStatut("REFUSEE");
        }

        DemandeConge saved = demandeRepository.save(demande);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntreprise(saved.getEntreprise());
        audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
        audit.setAction("VALIDATION_DEMANDE_CONGE");
        audit.setModule("RH_CONGE");
        audit.setCibleId(saved.getId().toString());
        audit.setDetails("Validation étape " + etape + " de congé pour l'agent : " + saved.getAgent().getNom() + " " + saved.getAgent().getPrenom() + ". Nouveau statut : " + saved.getStatut());
        auditLogRepository.save(audit);

        // Notification
        notificationService.creerAlerte(saved.getEntreprise(), "RH_CONGE", "La demande de congé (" + saved.getType() + ") de l'agent " + saved.getAgent().getNom() + " " + saved.getAgent().getPrenom() + " a été mise à jour par validation (" + saved.getStatut() + ").");

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/solde/{agentId}")
    public Map<String, Object> solde(@PathVariable("agentId") UUID agentId, @RequestParam(value = "annee", defaultValue = "2026") Integer annee) {
        SoldeConge solde = soldeRepository.findByAgentIdAndAnnee(agentId, annee).orElseGet(() -> {
            SoldeConge s = new SoldeConge();
            s.setEntreprise(tenantService.entreprise());
            s.setAgent(agentRepository.findById(agentId).orElseThrow());
            s.setAnnee(annee);
            s.setSoldeTotal(30);
            s.setJoursConsommes(0);
            s.setJoursRestants(30);
            return soldeRepository.save(s);
        });
        return Map.of("soldeTotal", solde.getSoldeTotal(), "joursConsommes", solde.getJoursConsommes(), "joursRestants", solde.getJoursRestants());
    }

    static int jours(DemandeConge demande) {
        return (int) ChronoUnit.DAYS.between(demande.getDateDebut(), demande.getDateFin()) + 1;
    }
}
