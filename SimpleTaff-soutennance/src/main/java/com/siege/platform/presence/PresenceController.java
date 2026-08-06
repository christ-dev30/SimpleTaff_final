package com.siege.platform.presence;

import com.siege.platform.pointage.Pointage;
import com.siege.platform.pointage.PointageRepository;
import com.siege.platform.rapport.RapportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/presences")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'EMPLOYEUR', 'SUPER_ADMIN')")
public class PresenceController {
    private final PointageRepository pointageRepository;
    private final RapportService rapportService;

    public PresenceController(PointageRepository pointageRepository, RapportService rapportService) {
        this.pointageRepository = pointageRepository;
        this.rapportService = rapportService;
    }

    @GetMapping
    public List<Map<String, Object>> mensuel(@RequestParam("mois") String mois) {
        YearMonth ym = YearMonth.parse(mois);
        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(
                ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay());
        return pointages.stream().map(this::ligne).toList();
    }

    @GetMapping("/export")
    public ResponseEntity<?> export(@RequestParam("mois") String mois,
            @RequestParam(value = "format", defaultValue = "xlsx") String format) {
        YearMonth ym = YearMonth.parse(mois);
        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(
                ym.atDay(1).atStartOfDay(), ym.plusMonths(1).atDay(1).atStartOfDay());

        byte[] content;
        String fileExtension;
        MediaType mediaType;

        if ("pdf".equals(format)) {
            content = rapportService.exportPresencesToPdf(mois, pointages);
            fileExtension = "pdf";
            mediaType = MediaType.APPLICATION_PDF;
        } else {
            Map<String, Object> rapport = rapportService.genererRapportPresences(mois);
            content = rapportService.exportToExcel(rapport);
            fileExtension = "csv";
            mediaType = MediaType.valueOf("text/csv;charset=UTF-8");
        }

        String filename = "presences-" + mois + "." + fileExtension;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(content);
    }

    private Map<String, Object> ligne(Pointage p) {
        LocalDateTime entree = p.getDateHeureEntree();
        LocalDateTime sortie = p.getDateHeureSortie();
        long duree = sortie == null ? 0 : Duration.between(entree, sortie).toMinutes();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("agentNom", p.getAffectation().getAgent().getNom() + " " + p.getAffectation().getAgent().getPrenom());
        m.put("date", entree.toLocalDate());
        m.put("heureArrivee", entree.toLocalTime());
        m.put("heureDepart", sortie != null ? sortie.toLocalTime() : null);
        m.put("presence", (entree != null && sortie != null) ? "Complet" : (entree != null ? "En cours" : "Absent"));
        String site = "-";
        if (p.getAffectation().getSiteTravail() != null && !p.getAffectation().getSiteTravail().trim().isEmpty()) {
            site = p.getAffectation().getSiteTravail();
        } else if (p.getAffectation().getZoneOperationnelle() != null && !p.getAffectation().getZoneOperationnelle().trim().isEmpty()) {
            site = p.getAffectation().getZoneOperationnelle();
        }
        
        String employeur = "Système/Auto";
        if (p.getValideParEmployeur() != null) {
            employeur = (p.getValideParEmployeur().getNom() + " " + p.getValideParEmployeur().getPrenom()).trim();
        } else if (p.getAffectation().getEmployeurResponsable() != null && !p.getAffectation().getEmployeurResponsable().trim().isEmpty()) {
            employeur = p.getAffectation().getEmployeurResponsable();
        } else if (p.getAffectation().getEntreprise() != null) {
            employeur = p.getAffectation().getEntreprise().getNom();
        }

        m.put("siteTravail", site);
        m.put("employeur", employeur);
        m.put("retard", entree.toLocalTime().isAfter(LocalTime.of(8, 0)));
        m.put("dureeMinutes", duree);
        m.put("heuresSupplementaires", Math.max(0, (duree - 480) / 60.0));
        m.put("travailNuit", sortie != null && sortie.toLocalTime().isAfter(LocalTime.of(21, 0)));
        m.put("dimancheTravaille", entree.getDayOfWeek() == DayOfWeek.SUNDAY);
        m.put("jourFerie", false);
        return m;
    }
}
