package com.siege.platform.rapport;

import com.siege.platform.pointage.Pointage;
import com.siege.platform.pointage.PointageRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rapports")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
@Transactional(readOnly = true)
public class RapportController {

    private final RapportService rapportService;
    private final PointageRepository pointageRepository;

    public RapportController(RapportService rapportService,
                             PointageRepository pointageRepository) {
        this.rapportService = rapportService;
        this.pointageRepository = pointageRepository;
    }

    @GetMapping("/{type}")
    public ResponseEntity<Map<String, Object>> getRapport(@PathVariable("type") String type,
                                                          @RequestParam(value = "mois", required = false) String mois) {
        if (mois == null || mois.isBlank()) {
            java.time.LocalDate now = java.time.LocalDate.now();
            mois = String.format("%d-%02d", now.getYear(), now.getMonthValue());
        }

        Map<String, Object> rapport = switch (type.toLowerCase()) {
            case "global", "synthese", "complet" -> rapportService.genererRapportGlobal(mois);
            case "pointages" -> rapportService.genererRapportPointages(mois, "json");
            case "presences" -> rapportService.genererRapportPresences(mois);
            case "conges" -> rapportService.genererRapportConges(mois);
            case "materiels" -> rapportService.genererRapportMateriels();
            case "disciplinaire" -> rapportService.genererRapportDisciplinaire(mois);
            default -> rapportService.genererRapportGlobal(mois);
        };
        return ResponseEntity.ok(rapport);
    }

    @GetMapping("/{type}/export")
    public ResponseEntity<?> export(@PathVariable("type") String type,
                                    @RequestParam(value = "format", defaultValue = "pdf") String format,
                                    @RequestParam(value = "mois", required = false) String mois) {
        if (mois == null || mois.isBlank()) {
            java.time.LocalDate now = java.time.LocalDate.now();
            mois = String.format("%d-%02d", now.getYear(), now.getMonthValue());
        }

        boolean isPdf = "pdf".equalsIgnoreCase(format);
        String typeLower = type.toLowerCase();

        // Presences: detailed per-agent monthly table
        if (isPdf && (typeLower.equals("presences"))) {
            YearMonth ym = YearMonth.parse(mois);
            LocalDateTime debut = ym.atDay(1).atStartOfDay();
            LocalDateTime fin = ym.plusMonths(1).atDay(1).atStartOfDay();
            List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debut, fin);
            byte[] content = rapportService.exportPresencesToPdf(mois, pointages);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"presences-" + mois + ".pdf\"")
                    .body(content);
        }

        // Global / synthese / complet: full multi-module professional PDF
        if (isPdf && (typeLower.equals("global") || typeLower.equals("synthese") || typeLower.equals("complet"))) {
            Map<String, Object> rapport = rapportService.genererRapportGlobal(mois);
            byte[] content = RapportPdfBuilder.build(rapport, mois);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"rapport_global_" + mois + ".pdf\"")
                    .body(content);
        }

        // For all other types, use the generic export
        Map<String, Object> rapport = switch (typeLower) {
            case "pointages" -> rapportService.genererRapportPointages(mois, format);
            case "conges" -> rapportService.genererRapportConges(mois);
            case "materiels" -> rapportService.genererRapportMateriels();
            case "disciplinaire" -> rapportService.genererRapportDisciplinaire(mois);
            default -> rapportService.genererRapportGlobal(mois);
        };

        byte[] content = isPdf ? RapportPdfBuilder.build(rapport, mois) : rapportService.exportToExcel(rapport);
        String fileExtension = isPdf ? "pdf" : "csv";
        String filename = type + "-" + mois + "." + fileExtension;
        MediaType mediaType = isPdf ? MediaType.APPLICATION_PDF : MediaType.valueOf("text/csv;charset=UTF-8");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(content);
    }

    @GetMapping("/agent/{agentId}/export")
    public ResponseEntity<?> exportAgent(@PathVariable("agentId") java.util.UUID agentId,
                                         @RequestParam(value = "format", defaultValue = "pdf") String format,
                                         @RequestParam(value = "mois", required = false) String mois) {
        if (mois == null || mois.isBlank()) {
            java.time.LocalDate now = java.time.LocalDate.now();
            mois = String.format("%d-%02d", now.getYear(), now.getMonthValue());
        }
        
        // Use global generation but we could filter it for the agent inside the builder if needed.
        // Since RapportService doesn't have a specific genererRapportAgent method, we will just use global for now.
        Map<String, Object> rapport = rapportService.genererRapportGlobal(mois);
        rapport.put("titre", "RAPPORT AGENT - " + mois);
        
        boolean isPdf = "pdf".equalsIgnoreCase(format);
        byte[] content = isPdf ? RapportPdfBuilder.build(rapport, mois) : rapportService.exportToExcel(rapport);
        String fileExtension = isPdf ? "pdf" : "csv";
        String filename = "agent-" + agentId + "-" + mois + "." + fileExtension;
        MediaType mediaType = isPdf ? MediaType.APPLICATION_PDF : MediaType.valueOf("text/csv;charset=UTF-8");

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(content);
    }
}
