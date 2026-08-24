package com.siege.platform.remplacement;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.config.tenant.TenantContext;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.entreprise.EntrepriseRepository;
import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.utilisateur.Utilisateur;
import com.siege.platform.utilisateur.UtilisateurRepository;
import com.siege.platform.common.enums.Role;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.ArrayList;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/remplacements")
public class DemandeRemplacementController {

    private final DemandeRemplacementRepository demandeRepository;
    private final AgentTerrainRepository agentRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final AffectationRepository affectationRepository;

    public DemandeRemplacementController(DemandeRemplacementRepository demandeRepository,
                                         AgentTerrainRepository agentRepository,
                                         UtilisateurRepository utilisateurRepository,
                                         EntrepriseRepository entrepriseRepository,
                                         AffectationRepository affectationRepository) {
        this.demandeRepository = demandeRepository;
        this.agentRepository = agentRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.entrepriseRepository = entrepriseRepository;
        this.affectationRepository = affectationRepository;
    }

    private Utilisateur getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails ud) {
            return utilisateurRepository.findByEmail(ud.getUsername()).orElse(null);
        }
        return null;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> signalerRemplacement(@RequestBody Map<String, String> payload) {
        Utilisateur current = getCurrentUser();
        if (current == null) return ResponseEntity.status(401).build();

        Entreprise ent = entrepriseRepository.findById(TenantContext.getTenantId()).orElseThrow();
        AgentTerrain agent = agentRepository.findById(UUID.fromString(payload.get("agentId"))).orElseThrow();

        DemandeRemplacement demande = new DemandeRemplacement();
        demande.setEntreprise(ent);
        demande.setAgent(agent);
        demande.setDemandeur(current);
        demande.setMotif(payload.get("motif"));
        demande.setStatut("EN_ATTENTE");

        demandeRepository.save(demande);
        return ResponseEntity.ok(Map.of("message", "Demande créée avec succès"));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listerDemandes() {
        Utilisateur current = getCurrentUser();
        if (current == null) return ResponseEntity.status(401).build();

        List<DemandeRemplacement> demandes;
        if (Role.ADMIN_ENTREPRISE.equals(current.getRole())) {
            demandes = demandeRepository.findAllByOrderByDateDemandeDesc();
        } else {
            demandes = demandeRepository.findByDemandeurId(current.getId());
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (DemandeRemplacement d : demandes) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", d.getId());
            map.put("dateDemande", d.getDateDemande() != null ? d.getDateDemande().toString() : "");
            map.put("motif", d.getMotif());
            map.put("statut", d.getStatut());
            
            if (d.getAgent() != null) {
                String nom = d.getAgent().getNom() != null ? d.getAgent().getNom() : "";
                String prenom = d.getAgent().getPrenom() != null ? d.getAgent().getPrenom() : "";
                map.put("agentNom", (nom + " " + prenom).trim());
            }
            if (d.getDemandeur() != null) {
                String nom = d.getDemandeur().getNom() != null ? d.getDemandeur().getNom() : "";
                String prenom = d.getDemandeur().getPrenom() != null ? d.getDemandeur().getPrenom() : "";
                map.put("demandeurNom", (nom + " " + prenom).trim());
            }
            result.add(map);
        }
        
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/traiter")
    @Transactional
    public ResponseEntity<?> traiterDemande(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        Utilisateur current = getCurrentUser();
        if (current == null || !Role.ADMIN_ENTREPRISE.equals(current.getRole())) return ResponseEntity.status(403).build();

        DemandeRemplacement demande = demandeRepository.findById(id).orElseThrow();
        String action = payload.get("action");
        if (action == null) {
            action = payload.get("decision");
        }
        
        // Convert "ACCEPTE" to "ACCEPTEE" if necessary
        if ("ACCEPTE".equals(action)) {
            action = "ACCEPTEE";
        } else if ("REFUSE".equals(action)) {
            action = "REJETEE";
        }
        
        demande.setStatut(action);
        demande.setReponse(payload.get("reponse"));
        demande.setDateTraitement(LocalDateTime.now());

        if ("ACCEPTEE".equals(action)) {
            // Terminer l'affectation actuelle de l'agent
            List<Affectation> affectations = affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(demande.getAgent().getId());
            for (Affectation aff : affectations) {
                if ("EN_COURS".equals(aff.getStatut()) || "ACTIVE".equals(aff.getStatut())) {
                    aff.setStatut("CLOTUREE");
                    aff.setMotifFin("REMPLACEMENT: " + demande.getMotif());
                    aff.setDateFinOccupation(LocalDate.now());
                    affectationRepository.save(aff);
                }
            }
            // Passer l'agent en statut INACTIF s'il l'est
            AgentTerrain agent = demande.getAgent();
            agent.setStatut("INACTIF");
            agentRepository.save(agent);
        }

        demandeRepository.save(demande);
        return ResponseEntity.ok(Map.of("message", "Demande traitée avec succès"));
    }
}
