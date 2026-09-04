package com.siege.platform.poste;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.agent.AgentTerrainRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
public class AffectationService {

    private final AffectationRepository affectationRepository;
    private final PosteRepository posteRepository;
    private final AgentTerrainRepository agentTerrainRepository;
    private final com.siege.platform.contrat.ContratAgentRepository contratRepository;

    public AffectationService(AffectationRepository affectationRepository, 
                              PosteRepository posteRepository, 
                              AgentTerrainRepository agentTerrainRepository,
                              com.siege.platform.contrat.ContratAgentRepository contratRepository) {
        this.affectationRepository = affectationRepository;
        this.posteRepository = posteRepository;
        this.agentTerrainRepository = agentTerrainRepository;
        this.contratRepository = contratRepository;
    }

    @Transactional
    public Affectation creerAffectation(UUID posteId, UUID agentId, LocalDate dateDebut, java.util.Map<String, String> payload) {
        // Validation : Agent doit avoir un contrat actif
        boolean hasContratActif = contratRepository.findByAgentIdOrderByDateDebutDesc(agentId)
            .stream().anyMatch(c -> "ACTIF".equals(c.getStatut()));
        if (!hasContratActif) {
            throw new IllegalStateException("Cet agent n'a pas de contrat actif.");
        }

        // Vérifier la contrainte critique métier
        if (affectationRepository.existsByAgentIdAndStatut(agentId, "ACTIVE")) {
            throw new IllegalStateException("Cet agent possède déjà une affectation active.");
        }

        Poste poste = posteRepository.findById(posteId)
                .orElseThrow(() -> new IllegalArgumentException("Poste introuvable"));
        AgentTerrain agent = agentTerrainRepository.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Agent introuvable"));

        Affectation affectation = new Affectation();
        affectation.setEntreprise(poste.getEntreprise());
        affectation.setPoste(poste);
        affectation.setAgent(agent);
        affectation.setDateDebutOccupation(dateDebut);
        affectation.setStatut("ACTIVE");

        // Map detailed fields
        if (payload != null) {
            affectation.setRegion(payload.get("region"));
            affectation.setVille(payload.get("ville"));
            affectation.setCommune(payload.get("commune"));
            affectation.setZoneOperationnelle(payload.get("zoneOperationnelle"));
            affectation.setSuperviseur(payload.get("superviseur"));
            affectation.setClient(payload.get("client"));
            affectation.setProjet(payload.get("projet"));
            affectation.setHeureArriveeSite(payload.get("heureArriveeSite"));
            affectation.setHeureDepartSite(payload.get("heureDepartSite"));
            affectation.setHeureDebut(payload.get("heureArriveeSite"));
            affectation.setHeureFin(payload.get("heureDepartSite"));
            affectation.setSiteTravail(payload.get("siteTravail"));
            affectation.setEmployeurResponsable(payload.get("employeurResponsable"));
        }

        poste.setStatut("POURVU");
        posteRepository.save(poste);

        return affectationRepository.save(affectation);
    }

    @Transactional
    public Affectation remplacerAgent(UUID affectationActuelleId, UUID nouvelAgentId, LocalDate dateRemplacement) {
        // 1. Clôturer l'affectation en cours
        Affectation ancienneAffectation = affectationRepository.findById(affectationActuelleId)
                .orElseThrow(() -> new IllegalArgumentException("Affectation introuvable"));

        if (!"ACTIVE".equals(ancienneAffectation.getStatut())) {
            throw new IllegalStateException("L'affectation n'est pas active.");
        }

        ancienneAffectation.setStatut("CLOTUREE");
        ancienneAffectation.setMotifFin("REMPLACEMENT");
        ancienneAffectation.setDateFinOccupation(dateRemplacement);
        affectationRepository.save(ancienneAffectation);

        // Map existing fields to the replacement where appropriate
        java.util.Map<String, String> payload = new java.util.HashMap<>();
        payload.put("region", ancienneAffectation.getRegion());
        payload.put("ville", ancienneAffectation.getVille());
        payload.put("commune", ancienneAffectation.getCommune());
        payload.put("zoneOperationnelle", ancienneAffectation.getZoneOperationnelle());
        payload.put("superviseur", ancienneAffectation.getSuperviseur());
        payload.put("client", ancienneAffectation.getClient());
        payload.put("projet", ancienneAffectation.getProjet());
        payload.put("heureArriveeSite", ancienneAffectation.getHeureArriveeSite());
        payload.put("heureDepartSite", ancienneAffectation.getHeureDepartSite());

        // 2. Ouvrir la nouvelle affectation (atomique grâce à @Transactional)
        return creerAffectation(ancienneAffectation.getPoste().getId(), nouvelAgentId, dateRemplacement, payload);
    }

    @Transactional
    public void cloturerAffectation(UUID affectationId, String motif, LocalDate dateFin) {
        Affectation affectation = affectationRepository.findById(affectationId)
                .orElseThrow(() -> new IllegalArgumentException("Affectation introuvable"));

        affectation.setStatut("CLOTUREE");
        affectation.setMotifFin(motif); // DEMISSION, URGENCE, etc.
        affectation.setDateFinOccupation(dateFin);
        affectationRepository.save(affectation);

        Poste poste = affectation.getPoste();
        poste.setStatut("OUVERT");
        posteRepository.save(poste);
    }
}
