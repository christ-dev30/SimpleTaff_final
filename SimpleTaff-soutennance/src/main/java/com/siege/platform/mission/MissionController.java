package com.siege.platform.mission;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.poste.AffectationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/missions")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
public class MissionController {
    private final MissionRepository missionRepository;
    private final AgentTerrainRepository agentRepository;
    private final AffectationRepository affectationRepository;
    private final CurrentTenantService tenantService;

    public MissionController(MissionRepository missionRepository,
                             AgentTerrainRepository agentRepository,
                             AffectationRepository affectationRepository,
                             CurrentTenantService tenantService) {
        this.missionRepository = missionRepository;
        this.agentRepository = agentRepository;
        this.affectationRepository = affectationRepository;
        this.tenantService = tenantService;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(value = "agentId", required = false) UUID agentId) {
        List<Mission> missions = agentId == null ? missionRepository.findAll() : missionRepository.findByAgentIdOrderByPlanningDebutDesc(agentId);
        return missions.stream().map(this::toMap).toList();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        Mission mission = new Mission();
        mission.setEntreprise(tenantService.entreprise());
        mission.setAgent(agentRepository.findById(UUID.fromString((String) payload.get("agentId"))).orElseThrow());
        if (payload.get("affectationId") != null && !payload.get("affectationId").toString().isBlank()) {
            mission.setAffectation(affectationRepository.findById(UUID.fromString((String) payload.get("affectationId"))).orElse(null));
        }
        mission.setTitre((String) payload.get("titre"));
        mission.setObjectifs((String) payload.get("objectifs"));
        mission.setLocalisationLat(decimal(payload.get("localisationLat")));
        mission.setLocalisationLng(decimal(payload.get("localisationLng")));
        mission.setPlanningDebut(date(payload.get("planningDebut")));
        mission.setPlanningFin(date(payload.get("planningFin")));
        return ResponseEntity.ok(toMap(missionRepository.save(mission)));
    }

    @PostMapping("/{id}/demarrer")
    public ResponseEntity<?> demarrer(@PathVariable("id") UUID id, @RequestBody(required = false) Map<String, Object> payload) {
        Mission mission = missionRepository.findById(id).orElseThrow();
        mission.setStatut("EN_COURS");
        mission.setDemarreeLe(LocalDateTime.now());
        if (payload != null) {
            mission.setLocalisationLat(decimal(payload.get("localisationLat")));
            mission.setLocalisationLng(decimal(payload.get("localisationLng")));
        }
        return ResponseEntity.ok(toMap(missionRepository.save(mission)));
    }

    @PostMapping("/{id}/suspendre")
    public ResponseEntity<?> suspendre(@PathVariable("id") UUID id) {
        return changerStatut(id, "SUSPENDUE");
    }

    @PostMapping("/{id}/annuler")
    public ResponseEntity<?> annuler(@PathVariable("id") UUID id) {
        return changerStatut(id, "ANNULEE");
    }

    private ResponseEntity<?> changerStatut(UUID id, String statut) {
        Mission mission = missionRepository.findById(id).orElseThrow();
        mission.setStatut(statut);
        return ResponseEntity.ok(toMap(missionRepository.save(mission)));
    }

    private Map<String, Object> toMap(Mission m) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", m.getId());
        map.put("agentNom", m.getAgent() != null ? m.getAgent().getNom() + " " + m.getAgent().getPrenom() : null);
        map.put("titre", m.getTitre());
        map.put("localisationLat", m.getLocalisationLat());
        map.put("localisationLng", m.getLocalisationLng());
        map.put("objectifs", m.getObjectifs());
        map.put("planningDebut", m.getPlanningDebut());
        map.put("planningFin", m.getPlanningFin());
        map.put("statut", m.getStatut());
        return map;
    }

    private BigDecimal decimal(Object value) {
        return value == null || value.toString().isBlank() ? null : new BigDecimal(value.toString());
    }

    private java.time.LocalDate date(Object value) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        String valStr = value.toString();
        if (valStr.contains("T")) {
            return java.time.LocalDateTime.parse(valStr).toLocalDate();
        }
        return java.time.LocalDate.parse(valStr);
    }
}
