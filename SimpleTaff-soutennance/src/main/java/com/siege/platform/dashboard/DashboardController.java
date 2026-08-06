package com.siege.platform.dashboard;

import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.agent.PieceJustificativeRepository;
import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.materiel.MaterielRepository;
import com.siege.platform.paie.BulletinDePaieRepository;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.poste.PosteRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final AgentTerrainRepository agentTerrainRepository;
    private final PosteRepository posteRepository;
    private final AffectationRepository affectationRepository;
    private final ContratAgentRepository contratRepository;
    private final PieceJustificativeRepository pieceRepository;
    private final MaterielRepository materielRepository;
    private final BulletinDePaieRepository bulletinRepository;

    public DashboardController(AgentTerrainRepository agentTerrainRepository,
                               PosteRepository posteRepository,
                               AffectationRepository affectationRepository,
                               ContratAgentRepository contratRepository,
                               PieceJustificativeRepository pieceRepository,
                               MaterielRepository materielRepository,
                               BulletinDePaieRepository bulletinRepository) {
        this.agentTerrainRepository = agentTerrainRepository;
        this.posteRepository = posteRepository;
        this.affectationRepository = affectationRepository;
        this.contratRepository = contratRepository;
        this.pieceRepository = pieceRepository;
        this.materielRepository = materielRepository;
        this.bulletinRepository = bulletinRepository;
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN_ENTREPRISE')")
    public ResponseEntity<Map<String, Object>> getAdminDashboardData() {
        LocalDate today = LocalDate.now();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAgents", agentTerrainRepository.count());
        stats.put("totalPostes", posteRepository.count());
        stats.put("totalAffectationsActives", affectationRepository.count());
        stats.put("agentsActifs", agentTerrainRepository.count());
        stats.put("agentsEnMission", affectationRepository.count());
        stats.put("materielsAffectes", materielRepository.countByStatut("AFFECTE"));
        stats.put("materielsEnPanne", materielRepository.countByStatut("CASSE"));
        stats.put("contratsExpirant", contratRepository.findByDateFinBetweenAndStatut(today, today.plusDays(30), "ACTIF").size());
        stats.put("documentsExpirant", pieceRepository.findByDateExpirationBetween(today, today.plusDays(30)).size());
        stats.put("bulletinsMois", bulletinRepository.count());
        stats.put("tauxOccupation", 0);
        stats.put("tauxPresence", 0);
        stats.put("masseSalarialeMois", 0);
        stats.put("primesVerseesMois", 0);
        return ResponseEntity.ok(stats);
    }
}
