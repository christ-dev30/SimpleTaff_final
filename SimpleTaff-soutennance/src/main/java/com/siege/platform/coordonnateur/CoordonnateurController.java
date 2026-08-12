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

    public CoordonnateurController(AgentTerrainRepository agentRepo,
                                    AffectationRepository affectationRepo,
                                    ZoneRepository zoneRepo,
                                    PointageRepository pointageRepo,
                                    com.siege.platform.agent.AgentTerrainService agentTerrainService,
                                    com.siege.platform.pointage.CarteAgentRepository carteAgentRepository) {
        this.agentRepo = agentRepo;
        this.affectationRepo = affectationRepo;
        this.zoneRepo = zoneRepo;
        this.pointageRepo = pointageRepo;
        this.agentTerrainService = agentTerrainService;
        this.carteAgentRepository = carteAgentRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();
        stats.put("totalAgents", agentRepo.count());
        stats.put("totalAffectations", affectationRepo.count());
        stats.put("pointagesAujourdhui", pointageRepo.countByDateHeureEntreeBetween(start, end));
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/agents")
    public ResponseEntity<List<Map<String, Object>>> getAgents() {
        List<AgentTerrain> agents = agentTerrainService.listAll();
        List<Map<String, Object>> result = new ArrayList<>();
        
        List<com.siege.platform.pointage.CarteAgent> cartes = carteAgentRepository.findAll();
        Map<UUID, String> agentQrMap = new HashMap<>();
        for (com.siege.platform.pointage.CarteAgent c : cartes) {
            if ("ACTIVE".equals(c.getStatut())) {
                agentQrMap.put(c.getAgent().getId(), c.getCodeQr());
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
            map.put("identifiantNfc", a.getIdentifiantNfc());
            
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
