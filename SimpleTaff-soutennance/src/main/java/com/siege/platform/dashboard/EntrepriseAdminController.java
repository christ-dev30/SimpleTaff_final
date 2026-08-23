package com.siege.platform.dashboard;

import com.siege.platform.emploi.Emploi;
import com.siege.platform.emploi.EmploiRepository;
import com.siege.platform.poste.*;
import com.siege.platform.structuredemandeuse.Site;
import com.siege.platform.structuredemandeuse.SiteRepository;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.entreprise.EntrepriseRepository;
import com.siege.platform.contrat.ContratAgent;
import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.agent.AgentTerrainRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN', 'COORDONNATEUR')")
public class EntrepriseAdminController {

    private final SiteRepository siteRepository;
    private final PosteRepository posteRepository;
    private final AffectationRepository affectationRepository;
    private final AffectationService affectationService;
    private final EmploiRepository emploiRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final ContratAgentRepository contratAgentRepository;
    private final AgentTerrainRepository agentTerrainRepository;

    public EntrepriseAdminController(SiteRepository siteRepository,
                                     PosteRepository posteRepository,
                                     AffectationRepository affectationRepository,
                                     AffectationService affectationService,
                                     EmploiRepository emploiRepository,
                                     EntrepriseRepository entrepriseRepository,
                                     ContratAgentRepository contratAgentRepository,
                                     AgentTerrainRepository agentTerrainRepository) {
        this.siteRepository = siteRepository;
        this.posteRepository = posteRepository;
        this.affectationRepository = affectationRepository;
        this.affectationService = affectationService;
        this.emploiRepository = emploiRepository;
        this.entrepriseRepository = entrepriseRepository;
        this.contratAgentRepository = contratAgentRepository;
        this.agentTerrainRepository = agentTerrainRepository;
    }


    @GetMapping("/sites")
    public ResponseEntity<List<Map<String, Object>>> getSites() {
        List<Site> sites = siteRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();
        for (Site s : sites) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", s.getId());
            map.put("nom", s.getNom());
            map.put("adresse", s.getAdresse());
            map.put("zoneNom", s.getZone() != null ? s.getZone().getNom() : "—");
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/emplois")
    public ResponseEntity<List<Emploi>> getEmplois() {
        return ResponseEntity.ok(emploiRepository.findAll());
    }

    @PostMapping("/emplois")
    public ResponseEntity<?> createEmploi(@RequestBody Map<String, Object> payload) {
        UUID enterpriseId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        if (enterpriseId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucune entreprise dans le contexte."));
        }
        try {
            String libelle = (String) payload.get("libelle");
            if (libelle == null || libelle.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Intitulé d'emploi requis."));
            }
            Entreprise e = entrepriseRepository.findById(enterpriseId).orElseThrow();
            Emploi emp = new Emploi();
            emp.setEntreprise(e);
            emp.setLibelle(libelle.trim());
            emp.setCategorie((String) payload.getOrDefault("categorie", "AGENT_TERRAIN"));
            emp.setDescription((String) payload.getOrDefault("description", ""));
            emp.setCompetencesRequises((String) payload.getOrDefault("competencesRequises", ""));
            if (payload.get("salaireBrutReference") != null && !payload.get("salaireBrutReference").toString().isBlank()) {
                emp.setSalaireBrutReference(new BigDecimal(payload.get("salaireBrutReference").toString()));
            }
            Emploi saved = emploiRepository.save(emp);
            return ResponseEntity.ok(saved);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @GetMapping("/postes")
    public ResponseEntity<List<Map<String, Object>>> getPostes() {
        List<Poste> postes = posteRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();
        for (Poste p : postes) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("siteNom", p.getSite() != null ? p.getSite().getNom() : "—");
            map.put("emploiLibelle", p.getEmploi() != null ? p.getEmploi().getLibelle() : "—");
            map.put("salaireBrut", p.getSalaireBrutNegocie());
            map.put("statut", p.getStatut());
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/affectations")
    public ResponseEntity<List<Map<String, Object>>> getAffectations() {
        List<Affectation> affectations = affectationRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();
        for (Affectation a : affectations) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("agentNom", a.getAgent() != null ? a.getAgent().getNom() + " " + a.getAgent().getPrenom() : "—");
            map.put("posteLibelle", a.getPoste() != null && a.getPoste().getEmploi() != null ? a.getPoste().getEmploi().getLibelle() : "—");
            map.put("siteNom", a.getPoste() != null && a.getPoste().getSite() != null ? a.getPoste().getSite().getNom() : "—");
            map.put("dateDebut", a.getDateDebutOccupation() != null ? a.getDateDebutOccupation().toString() : "—");
            map.put("dateFin", a.getDateFinOccupation() != null ? a.getDateFinOccupation().toString() : "—");
            map.put("statut", a.getStatut());
            map.put("structureCliente", a.getPoste() != null && a.getPoste().getSite() != null && a.getPoste().getSite().getStructureDemandeuse() != null ? a.getPoste().getSite().getStructureDemandeuse().getRaisonSociale() : "—");

            // Detailed operational fields
            String siteZone = a.getPoste() != null && a.getPoste().getSite() != null && a.getPoste().getSite().getZone() != null ? a.getPoste().getSite().getZone().getNom() : null;
            String siteVille = a.getPoste() != null && a.getPoste().getSite() != null ? a.getPoste().getSite().getAdresse() : null;
            
            map.put("region", a.getRegion());
            map.put("ville", a.getVille() != null ? a.getVille() : siteVille);
            map.put("commune", a.getCommune());
            map.put("zoneNom", siteZone);
            map.put("zoneOperationnelle", a.getZoneOperationnelle());
            map.put("superviseur", a.getSuperviseur());
            map.put("client", a.getClient());
            map.put("projet", a.getProjet());
            map.put("heureArriveeSite", a.getHeureArriveeSite());
            map.put("heureDepartSite", a.getHeureDepartSite());
            
            map.put("siteTravail", a.getSiteTravail() != null ? a.getSiteTravail() : (a.getPoste() != null && a.getPoste().getSite() != null ? a.getPoste().getSite().getNom() : "—"));
            map.put("employeurResponsable", a.getEmployeurResponsable() != null ? a.getEmployeurResponsable() : (a.getSuperviseur() != null ? a.getSuperviseur() : "—"));
            map.put("heureDebut", a.getHeureDebut() != null ? a.getHeureDebut() : (a.getHeureArriveeSite() != null ? a.getHeureArriveeSite() : "—"));
            map.put("heureFin", a.getHeureFin() != null ? a.getHeureFin() : (a.getHeureDepartSite() != null ? a.getHeureDepartSite() : "—"));

            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping("/affectations")
    public ResponseEntity<?> affecterAgent(@RequestBody Map<String, String> payload) {
        String posteIdStr = payload.get("posteId");
        String agentIdStr = payload.get("agentId");
        String siteIdStr = payload.get("siteId");
        String dateStr = payload.getOrDefault("dateDebut", LocalDate.now().toString());

        if (agentIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Agent requis."));
        }

        try {
            UUID agentId = UUID.fromString(agentIdStr);
            LocalDate dateDebut = LocalDate.parse(dateStr);
            UUID posteId = null;

            if (posteIdStr != null && !posteIdStr.isBlank()) {
                posteId = UUID.fromString(posteIdStr);
            } else if (siteIdStr != null && !siteIdStr.isBlank()) {
                UUID siteId = UUID.fromString(siteIdStr);
                AgentTerrain agent = agentTerrainRepository.findById(agentId)
                        .orElseThrow(() -> new IllegalArgumentException("Agent introuvable."));
                
                List<ContratAgent> contrats = contratAgentRepository.findByAgentIdOrderByDateDebutDesc(agentId);
                ContratAgent activeContrat = contrats.stream()
                        .filter(c -> "ACTIF".equalsIgnoreCase(c.getStatut()))
                        .findFirst()
                        .orElse(contrats.isEmpty() ? null : contrats.get(0));

                if (activeContrat == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "L'agent n'a pas de contrat actif pour cette affectation."));
                }

                String fonction = activeContrat.getFonction();
                if (fonction == null || fonction.isBlank()) {
                    fonction = "Agent de Terrain";
                }

                UUID enterpriseId = com.siege.platform.config.tenant.TenantContext.getTenantId();
                Entreprise entreprise = entrepriseRepository.findById(enterpriseId)
                        .orElseThrow(() -> new IllegalArgumentException("Entreprise introuvable."));

                List<Emploi> emplois = emploiRepository.findByEntrepriseId(enterpriseId);
                String finalFonction = fonction;
                Emploi emploi = emplois.stream()
                        .filter(e -> finalFonction.equalsIgnoreCase(e.getLibelle()))
                        .findFirst()
                        .orElseGet(() -> {
                            Emploi newEmp = new Emploi();
                            newEmp.setEntreprise(entreprise);
                            newEmp.setLibelle(finalFonction);
                            newEmp.setCategorie("AGENT_TERRAIN");
                            newEmp.setDescription("Créé automatiquement pour affectation");
                            newEmp.setSalaireBrutReference(activeContrat.getSalaireBase());
                            return emploiRepository.save(newEmp);
                        });

                Site site = siteRepository.findById(siteId)
                        .orElseThrow(() -> new IllegalArgumentException("Site de travail introuvable."));

                Poste poste = new Poste();
                poste.setEntreprise(entreprise);
                poste.setSite(site);
                poste.setEmploi(emploi);
                poste.setSalaireBrutNegocie(activeContrat.getSalaireBase() != null ? activeContrat.getSalaireBase() : BigDecimal.ZERO);
                poste.setMontantRetenueForfaitaire(poste.getSalaireBrutNegocie().divide(BigDecimal.valueOf(30), 2, java.math.RoundingMode.HALF_UP));
                poste.setStatut("OUVERT");
                Poste savedPoste = posteRepository.save(poste);
                posteId = savedPoste.getId();
            }

            if (posteId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Poste ou Site requis pour l'affectation."));
            }

            Affectation aff = affectationService.creerAffectation(posteId, agentId, dateDebut, payload);
            
            if (payload.get("employeurResponsable") != null) {
                aff.setEmployeurResponsable(payload.get("employeurResponsable"));
            }
            if (payload.get("heureDebut") != null) {
                aff.setHeureDebut(payload.get("heureDebut"));
            }
            if (payload.get("heureFin") != null) {
                aff.setHeureFin(payload.get("heureFin"));
            }
            if (payload.get("dateFin") != null && !payload.get("dateFin").isBlank()) {
                aff.setDateFinOccupation(LocalDate.parse(payload.get("dateFin")));
            }
            if (aff.getPoste() != null && aff.getPoste().getSite() != null) {
                aff.setSiteTravail(aff.getPoste().getSite().getNom());
            }
            affectationRepository.save(aff);

            return ResponseEntity.ok(Map.of("message", "Affectation créée !", "id", aff.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/affectations/{id}/cloturer")
    public ResponseEntity<?> cloturerAffectation(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload) {
        String motif = payload.getOrDefault("motif", "FIN_CONTRAT");
        String dateStr = payload.getOrDefault("dateFin", LocalDate.now().toString());

        try {
            LocalDate dateFin = LocalDate.parse(dateStr);
            affectationService.cloturerAffectation(id, motif, dateFin);
            return ResponseEntity.ok(Map.of("message", "Affectation clôturée."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/entreprise/config")
    public ResponseEntity<?> getEntrepriseConfig() {
        UUID enterpriseId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        if (enterpriseId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucune entreprise dans le contexte."));
        }
        Entreprise e = entrepriseRepository.findById(enterpriseId).orElse(null);
        if (e == null) {
            return ResponseEntity.notFound().build();
        }
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("nom", e.getNom());
        map.put("statut", e.getStatut());
        map.put("formuleAbonnement", e.getFormuleAbonnement());
        map.put("tauxCotisation", e.getTauxCotisation());
        map.put("seuilAbsenceLongueJours", e.getSeuilAbsenceLongueJours());
        map.put("tauxRetenueReduite", e.getTauxRetenueReduite());
        return ResponseEntity.ok(map);
    }

    @PutMapping("/entreprise/config")
    public ResponseEntity<?> updateEntrepriseConfig(@RequestBody Map<String, Object> payload) {
        UUID enterpriseId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        if (enterpriseId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucune entreprise dans le contexte."));
        }
        Entreprise e = entrepriseRepository.findById(enterpriseId).orElse(null);
        if (e == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            if (payload.containsKey("tauxCotisation")) {
                e.setTauxCotisation(new BigDecimal(payload.get("tauxCotisation").toString()));
            }
            if (payload.containsKey("seuilAbsenceLongueJours")) {
                e.setSeuilAbsenceLongueJours(((Number) payload.get("seuilAbsenceLongueJours")).intValue());
            }
            if (payload.containsKey("tauxRetenueReduite")) {
                e.setTauxRetenueReduite(new BigDecimal(payload.get("tauxRetenueReduite").toString()));
            }
            entrepriseRepository.save(e);
            return ResponseEntity.ok(Map.of("message", "Configuration mise à jour avec succès !"));
        } catch (Exception err) {
            return ResponseEntity.badRequest().body(Map.of("message", err.getMessage()));
        }
    }

    @PostMapping("/postes")
    public ResponseEntity<?> createPoste(@RequestBody Map<String, Object> payload) {
        UUID enterpriseId = com.siege.platform.config.tenant.TenantContext.getTenantId();
        if (enterpriseId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Aucune entreprise dans le contexte."));
        }
        try {
            UUID siteId = UUID.fromString((String) payload.get("siteId"));
            UUID empleoId = UUID.fromString((String) payload.get("emploiId"));
            BigDecimal salaireBrutNegocie = new BigDecimal(payload.get("salaireBrutNegocie").toString());
            BigDecimal montantRetenueForfaitaire = new BigDecimal(payload.get("montantRetenueForfaitaire").toString());

            Site site = siteRepository.findById(siteId).orElseThrow(() -> new RuntimeException("Site introuvable."));
            Emploi emploi = emploiRepository.findById(empleoId).orElseThrow(() -> new RuntimeException("Emploi introuvable."));
            Entreprise entreprise = entrepriseRepository.findById(enterpriseId).orElseThrow(() -> new RuntimeException("Entreprise introuvable."));

            Poste poste = new Poste();
            poste.setEntreprise(entreprise);
            poste.setSite(site);
            poste.setEmploi(emploi);
            poste.setSalaireBrutNegocie(salaireBrutNegocie);
            poste.setMontantRetenueForfaitaire(montantRetenueForfaitaire);
            poste.setStatut("OUVERT");

            Poste saved = posteRepository.save(poste);
            return ResponseEntity.ok(Map.of("message", "Poste créé avec succès !", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/postes/{id}")
    public ResponseEntity<?> deletePoste(@PathVariable("id") UUID id) {
        if (!posteRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        posteRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Poste supprimé."));
    }

    @DeleteMapping("/emplois/{id}")
    public ResponseEntity<?> deleteEmploi(@PathVariable("id") UUID id) {
        if (!emploiRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        emploiRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Emploi supprimé."));
    }
}

