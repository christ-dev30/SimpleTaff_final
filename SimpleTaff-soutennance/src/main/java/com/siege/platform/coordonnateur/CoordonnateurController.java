package com.siege.platform.coordonnateur;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.pointage.Pointage;
import com.siege.platform.pointage.PointageRepository;
import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.poste.Poste;
import com.siege.platform.zone.Zone;
import com.siege.platform.zone.ZoneRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/coordonnateur")
@PreAuthorize("hasAnyRole('COORDONNATEUR', 'ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class CoordonnateurController {

    private final AgentTerrainRepository agentRepo;
    private final AffectationRepository affectationRepo;
    private final ZoneRepository zoneRepo;
    private final PointageRepository pointageRepo;
    private final com.siege.platform.agent.AgentTerrainService agentTerrainService;
    private final com.siege.platform.pointage.CarteAgentRepository carteAgentRepository;

    private final com.siege.platform.materiel.DemandeMaterielRepository demandeMaterielRepo;
    private final com.siege.platform.evaluation.EvaluationAgentRepository evaluationAgentRepo;

    public CoordonnateurController(AgentTerrainRepository agentRepo,
                                    AffectationRepository affectationRepo,
                                    ZoneRepository zoneRepo,
                                    PointageRepository pointageRepo,
                                    com.siege.platform.agent.AgentTerrainService agentTerrainService,
                                    com.siege.platform.pointage.CarteAgentRepository carteAgentRepository,
                                    com.siege.platform.materiel.DemandeMaterielRepository demandeMaterielRepo,
                                    com.siege.platform.evaluation.EvaluationAgentRepository evaluationAgentRepo) {
        this.agentRepo = agentRepo;
        this.affectationRepo = affectationRepo;
        this.zoneRepo = zoneRepo;
        this.pointageRepo = pointageRepo;
        this.agentTerrainService = agentTerrainService;
        this.carteAgentRepository = carteAgentRepository;
        this.demandeMaterielRepo = demandeMaterielRepo;
        this.evaluationAgentRepo = evaluationAgentRepo;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        stats.put("totalAgents", agentRepo.count());
        stats.put("totalAffectations", affectationRepo.count());
        
        List<Affectation> activeAffectations = affectationRepo.findAll().stream()
                .filter(a -> "ACTIVE".equalsIgnoreCase(a.getStatut()) && a.getAgent() != null)
                .toList();

        long attendus = activeAffectations.size();
        
        List<Pointage> todayPointages = pointageRepo.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(start, end);
        Set<UUID> agentsPresents = new HashSet<>();
        for (Pointage p : todayPointages) {
            if (p.getAffectation() != null && p.getAffectation().getAgent() != null) {
                agentsPresents.add(p.getAffectation().getAgent().getId());
            }
        }
        long pointagesJour = agentsPresents.size();
        
        long demandesCount = demandeMaterielRepo.findAll().stream()
                .filter(d -> "EN_ATTENTE".equalsIgnoreCase(d.getStatut()))
                .count();
        long evaluationsCount = evaluationAgentRepo.count();

        stats.put("pointagesAujourdhui", todayPointages.size());
        stats.put("agentsAttendus", attendus);
        stats.put("agentsSurSite", pointagesJour);
        stats.put("absencesRetards", Math.max(0, attendus - pointagesJour));
        stats.put("demandesMateriel", demandesCount);
        stats.put("rapportsIncidents", evaluationsCount); 
        stats.put("evaluations", evaluationsCount); 

        // Calculate Zones Coverage & Alerts
        Map<String, int[]> zoneStats = new HashMap<>(); // zoneNom -> {attendus, presents}
        List<Map<String, Object>> alertes = new ArrayList<>();

        for (Affectation af : activeAffectations) {
            String zoneNom = (af.getPoste() != null && af.getPoste().getSite() != null && af.getPoste().getSite().getZone() != null)
                    ? af.getPoste().getSite().getZone().getNom() : "Non Assignée";
            
            zoneStats.putIfAbsent(zoneNom, new int[]{0, 0});
            zoneStats.get(zoneNom)[0]++; // attendu
            
            if (agentsPresents.contains(af.getAgent().getId())) {
                zoneStats.get(zoneNom)[1]++; // present
            } else {
                // Agent absent -> Alerte de remplacement
                String siteNom = af.getPoste() != null && af.getPoste().getSite() != null ? af.getPoste().getSite().getNom() : "Site Inconnu";
                String posteNom = af.getPoste() != null && af.getPoste().getEmploi() != null ? af.getPoste().getEmploi().getLibelle() : "Poste Inconnu";
                
                Map<String, Object> alerte = new HashMap<>();
                alerte.put("zone", zoneNom);
                alerte.put("site", siteNom);
                alerte.put("poste", posteNom);
                alerte.put("agentManquant", af.getAgent().getNom() + " " + af.getAgent().getPrenom());
                alertes.add(alerte);
            }
        }

        List<Map<String, Object>> zonesCoverage = new ArrayList<>();
        for (Map.Entry<String, int[]> entry : zoneStats.entrySet()) {
            Map<String, Object> zc = new HashMap<>();
            zc.put("zone", entry.getKey());
            zc.put("attendus", entry.getValue()[0]);
            zc.put("presents", entry.getValue()[1]);
            zc.put("pourcentage", entry.getValue()[0] > 0 ? (entry.getValue()[1] * 100 / entry.getValue()[0]) : 0);
            zonesCoverage.add(zc);
        }
        
        stats.put("zonesCoverage", zonesCoverage);
        stats.put("alertesRemplacement", alertes);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/agents")
    public ResponseEntity<List<Map<String, Object>>> getAgents() {
        List<AgentTerrain> agents = agentTerrainService.listAll();
        List<Map<String, Object>> result = new ArrayList<>();
        
        List<com.siege.platform.pointage.CarteAgent> cartes = carteAgentRepository.findAll();
        Map<UUID, String> agentQrMap = new HashMap<>();
        Map<UUID, String> agentNfcMap = new HashMap<>();
        for (com.siege.platform.pointage.CarteAgent c : cartes) {
            if ("ACTIVE".equals(c.getStatut())) {
                agentQrMap.put(c.getAgent().getId(), c.getCodeQr());
                agentNfcMap.put(c.getAgent().getId(), c.getIdentifiantNfc());
            }
        }

        for (AgentTerrain a : agents) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("nom", a.getNom());
            map.put("prenom", a.getPrenom());
            map.put("contact", a.getContact());
            map.put("statut", a.getStatut());
            map.put("zoneNom", a.getZone() != null ? a.getZone().getNom() : null);
            
            String qr = agentQrMap.get(a.getId());
            if (qr == null || !qr.startsWith("eyJ")) {
                qr = agentTerrainService.getOrCreateActiveCard(a);
            }
            map.put("codeQr", qr);
            map.put("matricule", a.getMatricule());
            map.put("photoUrl", a.getPhotoUrl());
            
            // Informations détaillées pour le dossier agent
            map.put("genre", a.getGenre());
            map.put("dateNaissance", a.getDateNaissance());
            map.put("lieuNaissance", a.getLieuNaissance());
            map.put("nationalite", a.getNationalite());
            map.put("situationMatrimoniale", a.getSituationMatrimoniale());
            map.put("nombreEnfants", a.getNombreEnfants());
            map.put("telephoneSecondaire", a.getTelephoneSecondaire());
            map.put("email", a.getEmail());
            map.put("commune", a.getCommune());
            map.put("ville", a.getVille());
            map.put("adresse", a.getAdresse());
            map.put("contactUrgenceNom", a.getContactUrgenceNom());
            map.put("contactUrgenceTelephone", a.getContactUrgenceTelephone());
            map.put("contactUrgenceLien", a.getContactUrgenceLien());
            map.put("identifiantNfc", agentNfcMap.get(a.getId()));
            
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/affectations")
    public ResponseEntity<List<Map<String, Object>>> getAffectations() {
        List<Affectation> affectations = affectationRepo.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Affectation af : affectations) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", af.getId());
            map.put("statut", af.getStatut());
            map.put("dateDebut", af.getDateDebutOccupation() != null ? af.getDateDebutOccupation().toString() : "—");
            map.put("dateFin", af.getDateFinOccupation() != null ? af.getDateFinOccupation().toString() : "—");
            map.put("agentNom", af.getAgent() != null
                    ? af.getAgent().getNom() + " " + af.getAgent().getPrenom() : "—");
            map.put("posteLibelle", af.getPoste() != null && af.getPoste().getEmploi() != null
                    ? af.getPoste().getEmploi().getLibelle() : "—");
            map.put("siteNom", af.getPoste() != null && af.getPoste().getSite() != null ? af.getPoste().getSite().getNom() : "—");
            map.put("zoneNom", af.getPoste() != null && af.getPoste().getSite() != null && af.getPoste().getSite().getZone() != null ? af.getPoste().getSite().getZone().getNom() : "—");
            map.put("structureCliente", af.getPoste() != null && af.getPoste().getSite() != null && af.getPoste().getSite().getStructureDemandeuse() != null ? af.getPoste().getSite().getStructureDemandeuse().getRaisonSociale() : "—");
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/pointages/today")
    public ResponseEntity<List<Map<String, Object>>> getPointagesToday() {
        return getPointages(LocalDate.now());
    }

    @GetMapping("/pointages")
    public ResponseEntity<List<Map<String, Object>>> getPointages(@RequestParam(value = "date", required = false) LocalDate date) {
        LocalDate selectedDate = date != null ? date : LocalDate.now();
        LocalDateTime start = selectedDate.atStartOfDay();
        LocalDateTime end = selectedDate.plusDays(1).atStartOfDay();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Pointage p : pointageRepo.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(start, end)) {
            Affectation affectation = p.getAffectation();
            Poste poste = affectation != null ? affectation.getPoste() : null;
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("agentNom", resolveAgentNom(affectation));
            map.put("typePointage", p.getDateHeureSortie() == null ? "ENTREE" : "SORTIE");
            map.put("dateHeure", p.getDateHeureSortie() != null ? p.getDateHeureSortie() : p.getDateHeureEntree());
            map.put("dateHeureEntree", p.getDateHeureEntree());
            map.put("dateHeureSortie", p.getDateHeureSortie());
            map.put("siteNom", poste != null && poste.getSite() != null ? poste.getSite().getNom() : null);
            map.put("structureCliente", poste != null && poste.getSite() != null && poste.getSite().getStructureDemandeuse() != null ? poste.getSite().getStructureDemandeuse().getRaisonSociale() : "—");
            map.put("statut", p.getStatut());
            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/pointages/dates")
    public ResponseEntity<List<Map<String, Object>>> getPointageDates() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : pointageRepo.findPointageDatesWithCounts()) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("date", row[0] != null ? row[0].toString() : null);
            map.put("total", row[1]);
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }

    private String resolveAgentNom(Affectation affectation) {
        if (affectation == null || affectation.getAgent() == null) {
            return "N/A";
        }
        return affectation.getAgent().getNom() + " " + affectation.getAgent().getPrenom();
    }

    @GetMapping("/zones")
    public ResponseEntity<List<Map<String, Object>>> getZones() {
        List<Zone> zones = zoneRepo.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Zone z : zones) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", z.getId());
            map.put("nom", z.getNom());
            map.put("description", z.getDescription());
            map.put("perimetre", z.getPerimetre());
            map.put("statut", z.getStatut());
            result.add(map);
        }
        return ResponseEntity.ok(result);
    }
}
