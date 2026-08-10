package com.siege.platform.rapport;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.conge.DemandeConge;
import com.siege.platform.conge.DemandeCongeRepository;
import com.siege.platform.disciplinaire.Sanction;
import com.siege.platform.disciplinaire.SanctionRepository;
import com.siege.platform.materiel.Materiel;
import com.siege.platform.materiel.MaterielRepository;
import com.siege.platform.mission.Mission;
import com.siege.platform.mission.MissionRepository;
import com.siege.platform.pointage.Pointage;
import com.siege.platform.pointage.PointageRepository;
import com.siege.platform.poste.Affectation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Chunk;
import com.lowagie.text.Element;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;

import java.io.ByteArrayOutputStream;
import java.awt.Color;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.time.temporal.WeekFields;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class RapportService {

    private final PointageRepository pointageRepository;
    private final DemandeCongeRepository demandeCongeRepository;
    private final MaterielRepository materielRepository;
    private final SanctionRepository sanctionRepository;
    private final MissionRepository missionRepository;

    public RapportService(PointageRepository pointageRepository,
                          DemandeCongeRepository demandeCongeRepository,
                          MaterielRepository materielRepository,
                          SanctionRepository sanctionRepository,
                          MissionRepository missionRepository) {
        this.pointageRepository = pointageRepository;
        this.demandeCongeRepository = demandeCongeRepository;
        this.materielRepository = materielRepository;
        this.sanctionRepository = sanctionRepository;
        this.missionRepository = missionRepository;
    }

    public Map<String, Object> genererRapportGlobal(String mois) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();
        LocalDateTime debutDateTime = debutMois.atStartOfDay();
        LocalDateTime finDateTime = ym.plusMonths(1).atDay(1).atStartOfDay();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "RAPPORT GLOBAL MULTI-MODULES - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        // 1. Présences & Pointages
        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debutDateTime, finDateTime);
        Map<String, Object> secPresences = new LinkedHashMap<>();
        secPresences.put("nombre_entrees", pointages.size());
        secPresences.put("duree_totale_minutes", calculateTotalDuration(pointages));
        long journeesPresentes = pointages.stream()
                .filter(p -> p.getDateHeureEntree() != null)
                .map(p -> p.getDateHeureEntree().toLocalDate())
                .distinct()
                .count();
        secPresences.put("journees_presentes", journeesPresentes);
        secPresences.put("liste", pointages.stream().map(this::pointageToMap).toList());
        report.put("presences", secPresences);

        // 2. Congés & Absences
        List<DemandeConge> allConges = demandeCongeRepository.findAll();
        List<DemandeConge> congesMois = allConges.stream()
                .filter(c -> c.getDateDebut() != null && !c.getDateDebut().isBefore(debutMois) && !c.getDateDebut().isAfter(finMois))
                .toList();
        Map<String, Object> secConges = new LinkedHashMap<>();
        secConges.put("total_demandes", congesMois.size());
        secConges.put("approuves", congesMois.stream().filter(c -> "APPROUVEE".equalsIgnoreCase(c.getStatut()) || "ACCORDE".equalsIgnoreCase(c.getStatut())).count());
        secConges.put("en_attente", congesMois.stream().filter(c -> c.getStatut() == null || c.getStatut().contains("EN_ATTENTE") || "PENDING".equalsIgnoreCase(c.getStatut())).count());
        secConges.put("refuses", congesMois.stream().filter(c -> "REFUSEE".equalsIgnoreCase(c.getStatut())).count());
        secConges.put("liste", congesMois.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agent", getAgentNomComplet(c.getAgent()));
            m.put("type", c.getType() != null ? c.getType() : "CONGE");
            m.put("debut", c.getDateDebut() != null ? c.getDateDebut().toString() : "—");
            m.put("fin", c.getDateFin() != null ? c.getDateFin().toString() : "—");
            long nbJours = (c.getDateDebut() != null && c.getDateFin() != null) ? (ChronoUnit.DAYS.between(c.getDateDebut(), c.getDateFin()) + 1) : 0;
            m.put("jours", nbJours);
            m.put("statut", c.getStatut() != null ? c.getStatut() : "EN_ATTENTE");
            return m;
        }).toList());
        report.put("conges", secConges);

        // 3. Matériels & Équipements
        List<Materiel> allMateriels = materielRepository.findAll();
        Map<String, Object> secMateriels = new LinkedHashMap<>();
        secMateriels.put("total_equipements", allMateriels.size());
        secMateriels.put("disponibles", allMateriels.stream().filter(m -> "DISPONIBLE".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("assignes", allMateriels.stream().filter(m -> "ASSIGNE".equalsIgnoreCase(m.getStatut()) || "AFFECTE".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("en_panne", allMateriels.stream().filter(m -> "EN_PANNE".equalsIgnoreCase(m.getStatut()) || "DEFECTUEUX".equalsIgnoreCase(m.getStatut()) || "REPARATION".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("perdu_ou_inutilisable", allMateriels.stream().filter(m -> "PERDU".equalsIgnoreCase(m.getStatut()) || "INUTILISABLE".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("liste", allMateriels.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("libelle", m.getLibelle() != null ? m.getLibelle() : "Sans nom");
            map.put("categorie", m.getCategorie() != null ? m.getCategorie() : "AUTRE");
            map.put("numero_serie", m.getNumeroSerie() != null ? m.getNumeroSerie() : "N/A");
            map.put("valeur", m.getValeurAchat() != null ? m.getValeurAchat().toString() + " FCFA" : "0 FCFA");
            map.put("statut", m.getStatut() != null ? m.getStatut() : "DISPONIBLE");
            return map;
        }).toList());
        report.put("materiels", secMateriels);

        // 4. Disciplinaire & Sanctions
        List<Sanction> allSanctions = sanctionRepository.findAll();
        List<Sanction> sanctionsMois = allSanctions.stream()
                .filter(s -> s.getDateDecision() != null && !s.getDateDecision().isBefore(debutMois) && !s.getDateDecision().isAfter(finMois))
                .toList();
        Map<String, Object> secDisciplinaire = new LinkedHashMap<>();
        secDisciplinaire.put("total_sanctions", sanctionsMois.size());
        secDisciplinaire.put("liste", sanctionsMois.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agent", getAgentNomComplet(s.getAgent()));
            m.put("type", s.getType() != null ? s.getType() : "AVERTISSEMENT");
            m.put("motif", s.getMotif() != null ? s.getMotif() : "—");
            m.put("date", s.getDateDecision() != null ? s.getDateDecision().toString() : "—");
            m.put("statut", s.getStatut() != null ? s.getStatut() : "ACTIVE");
            return m;
        }).toList());
        report.put("disciplinaire", secDisciplinaire);

        // 5. Missions
        List<Mission> allMissions = missionRepository.findAll();
        List<Mission> missionsMois = allMissions.stream()
                .filter(ms -> ms.getPlanningDebut() != null && !ms.getPlanningDebut().isBefore(debutMois) && !ms.getPlanningDebut().isAfter(finMois))
                .toList();
        Map<String, Object> secMissions = new LinkedHashMap<>();
        secMissions.put("total_missions", missionsMois.size());
        secMissions.put("prevues", missionsMois.stream().filter(m -> "PREVUE".equalsIgnoreCase(m.getStatut())).count());
        secMissions.put("en_cours", missionsMois.stream().filter(m -> "EN_COURS".equalsIgnoreCase(m.getStatut())).count());
        secMissions.put("terminees", missionsMois.stream().filter(m -> "TERMINEE".equalsIgnoreCase(m.getStatut())).count());
        secMissions.put("liste", missionsMois.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("titre", m.getTitre() != null ? m.getTitre() : "Mission sans titre");
            map.put("agent", getAgentNomComplet(m.getAgent()));
            map.put("debut", m.getPlanningDebut() != null ? m.getPlanningDebut().toString() : "—");
            map.put("fin", m.getPlanningFin() != null ? m.getPlanningFin().toString() : "—");
            map.put("statut", m.getStatut() != null ? m.getStatut() : "PREVUE");
            return map;
        }).toList());
        report.put("missions", secMissions);

        return report;
    }

    public Map<String, Object> genererRapportPointages(String mois, String format) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDateTime debut = ym.atDay(1).atStartOfDay();
        LocalDateTime fin = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debut, fin);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport de Pointages - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);
        report.put("nombre_entrees", pointages.size());
        report.put("duree_totale_minutes", calculateTotalDuration(pointages));

        Map<String, List<Map<String, Object>>> parAgent = new LinkedHashMap<>();
        for (Pointage p : pointages) {
            String agentKey = (p.getAffectation() != null && p.getAffectation().getAgent() != null && p.getAffectation().getAgent().getId() != null)
                    ? p.getAffectation().getAgent().getId().toString()
                    : "AGENT_NON_ASSIGNE";
            parAgent.computeIfAbsent(agentKey, k -> new ArrayList<>())
                    .add(pointageToMap(p));
        }

        report.put("par_agent", parAgent);
        report.put("total_agents", parAgent.size());
        return report;
    }

    public Map<String, Object> genererRapportPresences(String mois) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDateTime debut = ym.atDay(1).atStartOfDay();
        LocalDateTime fin = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debut, fin);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport de Présences - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        long journeesPresentes = pointages.stream()
                .filter(p -> p.getDateHeureEntree() != null)
                .map(p -> p.getDateHeureEntree().toLocalDate())
                .distinct()
                .count();

        Map<String, Object> sec = new LinkedHashMap<>();
        sec.put("nombre_entrees", pointages.size());
        sec.put("journees_presentes", journeesPresentes);
        sec.put("liste", pointages.stream().map(this::pointageToMap).toList());

        report.put("presences", sec);

        return report;
    }

    public Map<String, Object> genererRapportConges(String mois) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();

        List<DemandeConge> allConges = demandeCongeRepository.findAll();
        List<DemandeConge> congesMois = allConges.stream()
                .filter(c -> c.getDateDebut() != null && !c.getDateDebut().isBefore(debutMois) && !c.getDateDebut().isAfter(finMois))
                .toList();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport des Congés & Absences - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        Map<String, Object> secConges = new LinkedHashMap<>();
        secConges.put("total_demandes", congesMois.size());
        secConges.put("approuves", congesMois.stream().filter(c -> "APPROUVEE".equalsIgnoreCase(c.getStatut())).count());
        secConges.put("en_attente", congesMois.stream().filter(c -> c.getStatut() == null || c.getStatut().contains("EN_ATTENTE")).count());
        secConges.put("refuses", congesMois.stream().filter(c -> "REFUSEE".equalsIgnoreCase(c.getStatut())).count());
        secConges.put("liste", congesMois.stream().map(c -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agent", getAgentNomComplet(c.getAgent()));
            m.put("type", c.getType() != null ? c.getType() : "CONGE");
            m.put("debut", c.getDateDebut() != null ? c.getDateDebut().toString() : "—");
            m.put("fin", c.getDateFin() != null ? c.getDateFin().toString() : "—");
            long nbJours = (c.getDateDebut() != null && c.getDateFin() != null) ? (ChronoUnit.DAYS.between(c.getDateDebut(), c.getDateFin()) + 1) : 0;
            m.put("jours", nbJours);
            m.put("statut", c.getStatut() != null ? c.getStatut() : "EN_ATTENTE");
            return m;
        }).toList());
        report.put("conges", secConges);
        return report;
    }

    public Map<String, Object> genererRapportMateriels() {
        List<Materiel> allMateriels = materielRepository.findAll();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport de L'Inventaire Matériel");
        report.put("dateGeneration", LocalDate.now());

        Map<String, Object> secMateriels = new LinkedHashMap<>();
        secMateriels.put("total_equipements", allMateriels.size());
        secMateriels.put("disponibles", allMateriels.stream().filter(m -> "DISPONIBLE".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("assignes", allMateriels.stream().filter(m -> "ASSIGNE".equalsIgnoreCase(m.getStatut()) || "AFFECTE".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("en_panne", allMateriels.stream().filter(m -> "EN_PANNE".equalsIgnoreCase(m.getStatut()) || "DEFECTUEUX".equalsIgnoreCase(m.getStatut()) || "REPARATION".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("perdu_ou_inutilisable", allMateriels.stream().filter(m -> "PERDU".equalsIgnoreCase(m.getStatut()) || "INUTILISABLE".equalsIgnoreCase(m.getStatut())).count());
        secMateriels.put("liste", allMateriels.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("libelle", m.getLibelle() != null ? m.getLibelle() : "Sans nom");
            map.put("categorie", m.getCategorie() != null ? m.getCategorie() : "AUTRE");
            map.put("numero_serie", m.getNumeroSerie() != null ? m.getNumeroSerie() : "N/A");
            map.put("valeur", m.getValeurAchat() != null ? m.getValeurAchat().toString() + " FCFA" : "0 FCFA");
            map.put("statut", m.getStatut() != null ? m.getStatut() : "DISPONIBLE");
            return map;
        }).toList());
        report.put("materiels", secMateriels);
        return report;
    }

    public Map<String, Object> genererRapportDisciplinaire(String mois) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();

        List<Sanction> allSanctions = sanctionRepository.findAll();
        List<Sanction> sanctionsMois = allSanctions.stream()
                .filter(s -> s.getDateDecision() != null && !s.getDateDecision().isBefore(debutMois) && !s.getDateDecision().isAfter(finMois))
                .toList();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport Disciplinaire - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        Map<String, Object> secDisciplinaire = new LinkedHashMap<>();
        secDisciplinaire.put("total_sanctions", sanctionsMois.size());
        secDisciplinaire.put("liste", sanctionsMois.stream().map(s -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agent", getAgentNomComplet(s.getAgent()));
            m.put("type", s.getType() != null ? s.getType() : "AVERTISSEMENT");
            m.put("motif", s.getMotif() != null ? s.getMotif() : "—");
            m.put("date", s.getDateDecision() != null ? s.getDateDecision().toString() : "—");
            m.put("statut", s.getStatut() != null ? s.getStatut() : "ACTIVE");
            return m;
        }).toList());
        report.put("disciplinaire", secDisciplinaire);
        return report;
    }

    public Map<String, Object> genererRapportMissions(String mois) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();

        List<Mission> allMissions = missionRepository.findAll();
        List<Mission> missionsMois = allMissions.stream()
                .filter(ms -> ms.getPlanningDebut() != null && !ms.getPlanningDebut().isBefore(debutMois) && !ms.getPlanningDebut().isAfter(finMois))
                .toList();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport des Missions - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        Map<String, Object> secMissions = new LinkedHashMap<>();
        secMissions.put("total_missions", missionsMois.size());
        secMissions.put("liste", missionsMois.stream().map(m -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("titre", m.getTitre() != null ? m.getTitre() : "Mission sans titre");
            map.put("agent", getAgentNomComplet(m.getAgent()));
            map.put("debut", m.getPlanningDebut() != null ? m.getPlanningDebut().toString() : "—");
            map.put("fin", m.getPlanningFin() != null ? m.getPlanningFin().toString() : "—");
            map.put("statut", m.getStatut() != null ? m.getStatut() : "PREVUE");
            return map;
        }).toList());
        report.put("missions", secMissions);
        return report;
    }

    public Map<String, Object> genererRapportFacturation(String mois) {
        YearMonth ym = YearMonth.parse(mois);
        LocalDateTime debut = ym.atDay(1).atStartOfDay();
        LocalDateTime fin = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debut, fin);

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "Rapport de Facturation - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        long totalHeures = calculateTotalDuration(pointages) / 60;
        report.put("total_heures", totalHeures);
        report.put("taux_horaire_defaut", 15.0);
        report.put("montant_total_estime", totalHeures * 15.0);

        Map<String, Map<String, Object>> parAffectation = new LinkedHashMap<>();
        for (Pointage p : pointages) {
            String affectationKey = (p.getAffectation() != null && p.getAffectation().getId() != null) 
                    ? p.getAffectation().getId().toString() 
                    : "GLOBAL";
            if (!parAffectation.containsKey(affectationKey)) {
                parAffectation.put(affectationKey, new LinkedHashMap<>());
                String agentNom = (p.getAffectation() != null && p.getAffectation().getAgent() != null)
                        ? getAgentNomComplet(p.getAffectation().getAgent())
                        : "Agent Non Assigné";
                parAffectation.get(affectationKey).put("agent", agentNom);
                parAffectation.get(affectationKey).put("heures", 0L);
                parAffectation.get(affectationKey).put("pointages", new ArrayList<>());
            }

            long heures = calculateDurationMinutes(p) / 60;
            long currentHeures = ((Number) parAffectation.get(affectationKey).get("heures")).longValue();
            parAffectation.get(affectationKey).put("heures", currentHeures + heures);
            ((List<Object>) parAffectation.get(affectationKey).get("pointages")).add(pointageToMap(p));
        }

        report.put("lignes_facturation", parAffectation);
        return report;
    }

    /**
     * Generates a structured PDF presence report with one page per agent per week,
     * matching the "Feuille de Pointage Hebdomadaire Individuelle" format.
     */
    @SuppressWarnings("unchecked")
    public byte[] exportPresencesToPdf(String mois, List<Pointage> pointages) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 28, 28, 36, 28);
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, Color.DARK_GRAY);
            Font headerFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,  Color.WHITE);
            Font normalFont  = FontFactory.getFont(FontFactory.HELVETICA,      7,  Color.BLACK);
            Font boldFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,  Color.BLACK);
            Font smallFont   = FontFactory.getFont(FontFactory.HELVETICA,      6,  new Color(80,80,80));
            Font dayFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,  new Color(30,30,30));

            Color headerBg   = new Color(30, 41, 59);
            Color altRowBg   = new Color(200, 200, 200);
            Color lightGray  = new Color(235, 235, 235);
            Color white      = Color.WHITE;

            DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

            // Group pointages by agent
            Map<String, List<Pointage>> byAgent = new LinkedHashMap<>();
            for (Pointage p : pointages) {
                if (p.getAffectation() == null || p.getAffectation().getAgent() == null) continue;
                String agentKey = getAgentNomComplet(p.getAffectation().getAgent());
                byAgent.computeIfAbsent(agentKey, k -> new ArrayList<>()).add(p);
            }

            if (byAgent.isEmpty()) {
                Paragraph noData = new Paragraph("Aucune donnée de présence pour " + mois, titleFont);
                noData.setAlignment(Element.ALIGN_CENTER);
                document.add(noData);
                document.close();
                return baos.toByteArray();
            }

            YearMonth ym = YearMonth.parse(mois);
            // Collect all weeks in the month
            LocalDate firstDay = ym.atDay(1);
            LocalDate lastDay  = ym.atEndOfMonth();
            WeekFields wf = WeekFields.of(java.util.Locale.FRANCE);

            boolean firstPage = true;
            for (Map.Entry<String, List<Pointage>> entry : byAgent.entrySet()) {
                String agentNom = entry.getKey();
                List<Pointage> agentPointages = entry.getValue();

                // Build a day→pointage map
                Map<LocalDate, Pointage> dayMap = new LinkedHashMap<>();
                for (Pointage p : agentPointages) {
                    if (p.getDateHeureEntree() != null) {
                        dayMap.put(p.getDateHeureEntree().toLocalDate(), p);
                    }
                }

                if (!firstPage) document.newPage();
                firstPage = false;

                // === TITLE HEADER ===
                Paragraph mainTitle = new Paragraph("FEUILLE DE POINTAGE MENSUELLE INDIVIDUELLE", titleFont);
                mainTitle.setAlignment(Element.ALIGN_CENTER);
                mainTitle.setSpacingAfter(6);
                document.add(mainTitle);

                // Subtitle bar: Semaine du ... au ...
                Paragraph subtitle = new Paragraph(
                    "Salarié : " + agentNom + "    |    Période : " + mois,
                    boldFont);
                subtitle.setAlignment(Element.ALIGN_CENTER);
                subtitle.setSpacingAfter(4);
                document.add(subtitle);

                Paragraph legend = new Paragraph(
                    "MA/AT : Maladie/Accident    CP : Congés payés    CSS : Congés sans solde    " +
                    "ANA : Abs. non autorisée    ACH : Autre chantier",
                    smallFont);
                legend.setAlignment(Element.ALIGN_CENTER);
                legend.setSpacingAfter(3);
                document.add(legend);

                // === MAIN TIMESHEET TABLE ===
                PdfPTable table = new PdfPTable(7);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{15, 12, 12, 14, 18, 17, 12});

                // Header row
                String[] headers = {"Jour", "Heure\nArrivée", "Heure\nDépart", "Présence", "Site de\ntravail", "Employeur\n(Pointage)", "Retard"};
                for (String h : headers) {
                    PdfPCell hc = new PdfPCell(new Phrase(h, headerFont));
                    hc.setBackgroundColor(headerBg);
                    hc.setHorizontalAlignment(Element.ALIGN_CENTER);
                    hc.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    hc.setPadding(1.5f);
                    table.addCell(hc);
                }

                String[] dayNames = {"Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"};
                long totalMinutes = 0;
                int totalRetards = 0;
                int totalPresences = 0;
                
                // Extract default site and employeur from the agent's first pointage affectation
                String agentSite = "-";
                String agentEmployeur = "Système/Auto";
                if (!agentPointages.isEmpty() && agentPointages.get(0).getAffectation() != null) {
                    Affectation aff = agentPointages.get(0).getAffectation();
                    if (aff.getSiteTravail() != null && !aff.getSiteTravail().trim().isEmpty()) {
                        agentSite = aff.getSiteTravail();
                    } else if (aff.getZoneOperationnelle() != null && !aff.getZoneOperationnelle().trim().isEmpty()) {
                        agentSite = aff.getZoneOperationnelle();
                    }
                    if (aff.getEmployeurResponsable() != null && !aff.getEmployeurResponsable().trim().isEmpty()) {
                        agentEmployeur = aff.getEmployeurResponsable();
                    } else if (aff.getEntreprise() != null) {
                        agentEmployeur = aff.getEntreprise().getNom();
                    }
                }

                for (LocalDate day = firstDay; !day.isAfter(lastDay); day = day.plusDays(1)) {
                    int d = day.getDayOfWeek().getValue() - 1; // 0=Lundi, 6=Dimanche
                    boolean isWeekend = (d >= 5);
                    Color rowBg = isWeekend ? lightGray : white;

                    Pointage p = dayMap.get(day);

                    // Day cell
                    PdfPCell dayCell = new PdfPCell(new Phrase(dayNames[d] + "\n" + day.format(dateFmt), dayFont));
                    dayCell.setBackgroundColor(rowBg);
                    dayCell.setPadding(1.5f);
                    dayCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    dayCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                    table.addCell(dayCell);

                    String entree = "—";
                    String sortie = "—";
                    String presence = "Absent";
                    String site = agentSite;
                    String employeur = agentEmployeur;
                    String retard = "—";
                    
                    long dureeMin = 0;

                    if (p != null && p.getDateHeureEntree() != null) {
                        entree = p.getDateHeureEntree().toLocalTime().format(timeFmt);
                        presence = "En cours";
                        if (p.getDateHeureSortie() != null) {
                            sortie = p.getDateHeureSortie().toLocalTime().format(timeFmt);
                            dureeMin = Duration.between(p.getDateHeureEntree(), p.getDateHeureSortie()).toMinutes();
                            totalMinutes += dureeMin;
                            presence = "Complet";
                        }
                        
                        if (p.getAffectation() != null) {
                            if (p.getAffectation().getSiteTravail() != null && !p.getAffectation().getSiteTravail().trim().isEmpty()) {
                                site = p.getAffectation().getSiteTravail();
                            } else if (p.getAffectation().getZoneOperationnelle() != null && !p.getAffectation().getZoneOperationnelle().trim().isEmpty()) {
                                site = p.getAffectation().getZoneOperationnelle();
                            }
                        }
                        if (p.getValideParEmployeur() != null) {
                            employeur = (p.getValideParEmployeur().getNom() + " " + p.getValideParEmployeur().getPrenom()).trim();
                        }
                        
                        if (p.getDateHeureEntree().toLocalTime().isAfter(java.time.LocalTime.of(8, 0))) {
                            retard = "RETARD";
                            totalRetards++;
                        }
                        totalPresences++;
                    }

                    addPresCell(table, entree, normalFont, rowBg, true);
                    addPresCell(table, sortie, normalFont, rowBg, true);
                    addPresCell(table, presence, normalFont, rowBg, true);
                    addPresCell(table, site, normalFont, rowBg, false);
                    addPresCell(table, employeur, normalFont, rowBg, false);
                    
                    Font retardFont = "RETARD".equals(retard) ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.RED) : normalFont;
                    addPresCell(table, retard, retardFont, rowBg, true);
                }

                // Totaux row
                PdfPCell totLabel = new PdfPCell(new Phrase("TOTAUX", boldFont));
                totLabel.setColspan(3);
                totLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                totLabel.setPadding(1.5f);
                totLabel.setBackgroundColor(lightGray);
                table.addCell(totLabel);

                String totalHStr = String.format("%dh%02d", totalMinutes/60, totalMinutes%60);
                
                addPresCell(table, totalPresences + " prés.", boldFont, lightGray, true);
                addPresCell(table, "Heures: " + totalHStr, boldFont, lightGray, false);
                addPresCell(table, "—", normalFont, lightGray, false);
                addPresCell(table, totalRetards + " retard(s)", boldFont, lightGray, true);

                table.setSpacingAfter(4);
                document.add(table);

                // Footer note
                Paragraph footer = new Paragraph(
                    "Généré par SimpleTaff Platform — " + LocalDate.now().format(dateFmt),
                    smallFont);
                footer.setAlignment(Element.ALIGN_RIGHT);
                document.add(footer);
            }

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return ("Erreur génération PDF présences: " + e.getMessage()).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    private void addPresCell(PdfPTable table, String text, Font font, Color bg, boolean centered) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
        cell.setPadding(1.5f);
        cell.setBackgroundColor(bg);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setHorizontalAlignment(centered ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    @SuppressWarnings("unchecked")
    public byte[] exportToExcel(Map<String, Object> report) {
        StringBuilder sb = new StringBuilder();
        sb.append("\uFEFF");
        sb.append("sep=;\n");

        String borderLine = "================================================================================";

        sb.append(borderLine).append("\n");
        sb.append("SIMPLETAFF PLATFORM - SYNTHÈSE OPÉRATIONNELLE BIANNUELLE/MENSUELLE\n");
        sb.append("Document;").append(escapeCsv(report.getOrDefault("titre", "RAPPORT DE SYNTHÈSE"))).append("\n");
        sb.append("Date de Génération;").append(escapeCsv(report.getOrDefault("dateGeneration", LocalDate.now()))).append("\n");
        sb.append("Période Concernée;").append(escapeCsv(report.getOrDefault("period", "Global"))).append("\n");
        sb.append(borderLine).append("\n\n");

        if (report.containsKey("presences")) {
            Map<String, Object> sec = (Map<String, Object>) report.get("presences");
            sb.append(borderLine).append("\n");
            sb.append("MODULE 1 : PRÉSENCES & POINTAGES\n");
            sb.append("Nombre d'Entrées Totales;").append(sec.getOrDefault("nombre_entrees", 0)).append("\n");
            sb.append("Journées de Présence Distinctes;").append(sec.getOrDefault("journees_presentes", 0)).append("\n");
            sb.append(borderLine).append("\n");
            sb.append("Agent Terrain;Date du Pointage;Heure d'Entrée;Heure de Sortie;Présence;Site de Travail;Employeur (Pointage);Durée Travaillée (minutes)\n");

            List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
            long totalMinutes = 0;
            long totalRetards = 0;
            for (Map<String, Object> p : list) {
                totalMinutes += p.get("dureeMinutes") instanceof Number ? ((Number) p.get("dureeMinutes")).longValue() : 0;
                if (Boolean.TRUE.equals(p.get("retard"))) totalRetards++;
                
                sb.append(escapeCsv(p.get("agentNom") != null ? p.get("agentNom") : p.get("agent"))).append(";")
                  .append(escapeCsv(p.get("date"))).append(";")
                  .append(escapeCsv(p.get("heureArrivee") != null ? p.get("heureArrivee") : p.get("heure_entree"))).append(";")
                  .append(escapeCsv(p.get("heureDepart") != null ? p.get("heureDepart") : p.get("heure_sortie"))).append(";")
                  .append(escapeCsv(p.get("presence"))).append(";")
                  .append(escapeCsv(p.get("siteTravail"))).append(";")
                  .append(escapeCsv(p.get("employeur"))).append(";")
                  .append(escapeCsv(p.get("dureeMinutes") != null ? p.get("dureeMinutes") : p.get("duree_minutes"))).append("\n");
            }
            sb.append("TOTAUX;;;;").append(list.size()).append(" présence(s);;Total Heures : ").append(totalMinutes/60).append("h").append(String.format("%02d", totalMinutes%60)).append(";Total Retards : ").append(totalRetards).append("\n");
            sb.append("\n");
            sb.append("\n");
        }

        if (report.containsKey("conges")) {
            Map<String, Object> sec = (Map<String, Object>) report.get("conges");
            sb.append(borderLine).append("\n");
            sb.append("MODULE 2 : CONGÉS & ABSENCES\n");
            sb.append("Total des Demandes;").append(sec.getOrDefault("total_demandes", 0)).append("\n");
            sb.append("Demandes Approuvées;").append(sec.getOrDefault("approuves", 0)).append("\n");
            sb.append("Demandes En Attente;").append(sec.getOrDefault("en_attente", 0)).append("\n");
            sb.append("Demandes Refusées;").append(sec.getOrDefault("refuses", 0)).append("\n");
            sb.append(borderLine).append("\n");
            sb.append("Agent Demandeurs;Type de Congé;Date de Début;Date de Fin;Durée (Jours);Statut de la Demande\n");

            List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
            for (Map<String, Object> c : list) {
                sb.append(escapeCsv(c.get("agent"))).append(";")
                  .append(escapeCsv(c.get("type"))).append(";")
                  .append(escapeCsv(c.get("debut"))).append(";")
                  .append(escapeCsv(c.get("fin"))).append(";")
                  .append(escapeCsv(c.get("jours"))).append(";")
                  .append(escapeCsv(c.get("statut"))).append("\n");
            }
            sb.append("\n");
        }

        if (report.containsKey("materiels")) {
            Map<String, Object> sec = (Map<String, Object>) report.get("materiels");
            sb.append(borderLine).append("\n");
            sb.append("MODULE 3 : PARC MATÉRIEL & ÉQUIPEMENTS\n");
            sb.append("Total Équipements en Parc;").append(sec.getOrDefault("total_equipements", 0)).append("\n");
            sb.append("Matériels Disponibles;").append(sec.getOrDefault("disponibles", 0)).append("\n");
            sb.append("Matériels Assignés / Utilisés;").append(sec.getOrDefault("assignes", 0)).append("\n");
            sb.append("Matériels En Panne / Défaut;").append(sec.getOrDefault("en_panne", 0)).append("\n");
            sb.append("Matériels Perdu / Inutilisable;").append(sec.getOrDefault("perdu_ou_inutilisable", 0)).append("\n");
            sb.append(borderLine).append("\n");
            sb.append("Libellé Équipement;Catégorie;Numéro de Série;Valeur d'Achat;Statut de l'Équipement\n");

            List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
            for (Map<String, Object> m : list) {
                sb.append(escapeCsv(m.get("libelle"))).append(";")
                  .append(escapeCsv(m.get("categorie"))).append(";")
                  .append(escapeCsv(m.get("numero_serie"))).append(";")
                  .append(escapeCsv(m.get("valeur"))).append(";")
                  .append(escapeCsv(m.get("statut"))).append("\n");
            }
            sb.append("\n");
        }

        if (report.containsKey("disciplinaire")) {
            Map<String, Object> sec = (Map<String, Object>) report.get("disciplinaire");
            sb.append(borderLine).append("\n");
            sb.append("MODULE 4 : DISCIPLINAIRE & SANCTIONS\n");
            sb.append("Total Sanctions Appliquées;").append(sec.getOrDefault("total_sanctions", 0)).append("\n");
            sb.append(borderLine).append("\n");
            sb.append("Agent Sanctionné;Type de Sanction;Motif de la Sanction;Date de Décision;Statut Actuel\n");

            List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
            for (Map<String, Object> s : list) {
                sb.append(escapeCsv(s.get("agent"))).append(";")
                  .append(escapeCsv(s.get("type"))).append(";")
                  .append(escapeCsv(s.get("motif"))).append(";")
                  .append(escapeCsv(s.get("date"))).append(";")
                  .append(escapeCsv(s.get("statut"))).append("\n");
            }
            sb.append("\n");
        }

        if (report.containsKey("missions")) {
            Map<String, Object> sec = (Map<String, Object>) report.get("missions");
            sb.append(borderLine).append("\n");
            sb.append("MODULE 5 : MISSIONS & DÉPLACEMENTS\n");
            sb.append("Total Missions Planifiées;").append(sec.getOrDefault("total_missions", 0)).append("\n");
            sb.append("Missions Prévues;").append(sec.getOrDefault("prevues", 0)).append("\n");
            sb.append("Missions En Cours;").append(sec.getOrDefault("en_cours", 0)).append("\n");
            sb.append("Missions Terminées;").append(sec.getOrDefault("terminees", 0)).append("\n");
            sb.append(borderLine).append("\n");
            sb.append("Titre de la Mission;Agent Assigné;Date Début Prévue;Date Fin Prévue;Statut de la Mission\n");

            List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
            for (Map<String, Object> ms : list) {
                sb.append(escapeCsv(ms.get("titre"))).append(";")
                  .append(escapeCsv(ms.get("agent"))).append(";")
                  .append(escapeCsv(ms.get("debut"))).append(";")
                  .append(escapeCsv(ms.get("fin"))).append(";")
                  .append(escapeCsv(ms.get("statut"))).append("\n");
            }
            sb.append("\n");
        }

        sb.append(borderLine).append("\n");
        sb.append("FIN DU RAPPORT - SIMPLETAFF SAAS PLATFORM\n");

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String escapeCsv(Object val) {
        if (val == null) return "—";
        String str = val.toString().replace("\r", "").replace("\n", " ");
        if (str.contains(";") || str.contains("\"")) {
            str = "\"" + str.replace("\"", "\"\"") + "\"";
        }
        return str;
    }

    @SuppressWarnings("unchecked")
    public byte[] exportToPdf(Map<String, Object> report) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter.getInstance(document, baos);
            
            document.open();
            
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.DARK_GRAY);
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(15, 23, 42));
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 7, Color.BLACK);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.BLACK);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.WHITE);
            Color headerBg = new Color(30, 41, 59);
            
            Paragraph title = new Paragraph((String) report.getOrDefault("titre", "RAPPORT DE SYNTHÈSE OPERATIONNELLE"), titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            document.add(title);
            
            Paragraph meta = new Paragraph();
            meta.add(new Chunk("Date de Génération : ", boldFont));
            meta.add(new Chunk(report.getOrDefault("dateGeneration", LocalDate.now()).toString() + "  |  ", normalFont));
            meta.add(new Chunk("Période : ", boldFont));
            meta.add(new Chunk(report.getOrDefault("period", "Global").toString() + "\n", normalFont));
            meta.setSpacingAfter(6);
            document.add(meta);

            if (report.containsKey("presences")) {
                Map<String, Object> sec = (Map<String, Object>) report.get("presences");
                document.add(new Paragraph("1. PRÉSENCES & POINTAGES", sectionTitleFont));
                Paragraph sub = new Paragraph("Entrées totales : " + sec.getOrDefault("nombre_entrees", 0) + "  |  Journées de présence : " + sec.getOrDefault("journees_presentes", 0), normalFont);
                sub.setSpacingAfter(3);
                document.add(sub);

                PdfPTable table = new PdfPTable(5);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{25, 20, 15, 15, 25});
                
                addTableCell(table, "Agent", headerFont, headerBg, true);
                addTableCell(table, "Date", headerFont, headerBg, true);
                addTableCell(table, "Entrée", headerFont, headerBg, true);
                addTableCell(table, "Sortie", headerFont, headerBg, true);
                addTableCell(table, "Durée", headerFont, headerBg, true);

                List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
                for (Map<String, Object> p : list) {
                    addTableCell(table, p.get("agentNom") != null ? p.get("agentNom").toString() : "—", normalFont, null, false);
                    addTableCell(table, p.get("date") != null ? p.get("date").toString() : "—", normalFont, null, false);
                    addTableCell(table, p.get("heureArrivee") != null ? p.get("heureArrivee").toString() : "—", normalFont, null, false);
                    addTableCell(table, p.get("heureDepart") != null ? p.get("heureDepart").toString() : "—", normalFont, null, false);
                    addTableCell(table, (p.get("dureeMinutes") != null ? p.get("dureeMinutes").toString() : "0") + " min", normalFont, null, false);
                }
                table.setSpacingAfter(6);
                document.add(table);
            }

            if (report.containsKey("conges")) {
                Map<String, Object> sec = (Map<String, Object>) report.get("conges");
                document.add(new Paragraph("2. CONGÉS & ABSENCES", sectionTitleFont));
                Paragraph sub = new Paragraph("Demandes : " + sec.getOrDefault("total_demandes", 0) + "  |  Approuvés : " + sec.getOrDefault("approuves", 0) + "  |  En attente : " + sec.getOrDefault("en_attente", 0), normalFont);
                sub.setSpacingAfter(3);
                document.add(sub);

                PdfPTable table = new PdfPTable(6);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{25, 15, 15, 15, 12, 18});

                addTableCell(table, "Agent", headerFont, headerBg, true);
                addTableCell(table, "Type", headerFont, headerBg, true);
                addTableCell(table, "Début", headerFont, headerBg, true);
                addTableCell(table, "Fin", headerFont, headerBg, true);
                addTableCell(table, "Jours", headerFont, headerBg, true);
                addTableCell(table, "Statut", headerFont, headerBg, true);

                List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
                for (Map<String, Object> c : list) {
                    addTableCell(table, c.get("agent") != null ? c.get("agent").toString() : "—", normalFont, null, false);
                    addTableCell(table, c.get("type") != null ? c.get("type").toString() : "—", normalFont, null, false);
                    addTableCell(table, c.get("debut") != null ? c.get("debut").toString() : "—", normalFont, null, false);
                    addTableCell(table, c.get("fin") != null ? c.get("fin").toString() : "—", normalFont, null, false);
                    addTableCell(table, c.get("jours") != null ? c.get("jours").toString() : "—", normalFont, null, false);
                    addTableCell(table, c.get("statut") != null ? c.get("statut").toString() : "—", normalFont, null, false);
                }
                table.setSpacingAfter(6);
                document.add(table);
            }

            if (report.containsKey("materiels")) {
                Map<String, Object> sec = (Map<String, Object>) report.get("materiels");
                document.add(new Paragraph("3. PARC MATÉRIEL & ÉQUIPEMENTS", sectionTitleFont));
                Paragraph sub = new Paragraph("Total Équipements : " + sec.getOrDefault("total_equipements", 0) + 
                        "  |  Disponibles : " + sec.getOrDefault("disponibles", 0) + 
                        "  |  Défaut/Panne : " + sec.getOrDefault("en_panne", 0) +
                        "  |  Perdu/HS : " + sec.getOrDefault("perdu_ou_inutilisable", 0), normalFont);
                sub.setSpacingAfter(3);
                document.add(sub);

                PdfPTable table = new PdfPTable(5);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{30, 20, 20, 15, 15});

                addTableCell(table, "Libellé", headerFont, headerBg, true);
                addTableCell(table, "Catégorie", headerFont, headerBg, true);
                addTableCell(table, "N° Série", headerFont, headerBg, true);
                addTableCell(table, "Valeur", headerFont, headerBg, true);
                addTableCell(table, "Statut", headerFont, headerBg, true);

                List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
                for (Map<String, Object> m : list) {
                    addTableCell(table, m.get("libelle") != null ? m.get("libelle").toString() : "—", normalFont, null, false);
                    addTableCell(table, m.get("categorie") != null ? m.get("categorie").toString() : "—", normalFont, null, false);
                    addTableCell(table, m.get("numero_serie") != null ? m.get("numero_serie").toString() : "—", normalFont, null, false);
                    addTableCell(table, m.get("valeur") != null ? m.get("valeur").toString() : "—", normalFont, null, false);
                    addTableCell(table, m.get("statut") != null ? m.get("statut").toString() : "—", normalFont, null, false);
                }
                table.setSpacingAfter(6);
                document.add(table);
            }

            if (report.containsKey("disciplinaire")) {
                Map<String, Object> sec = (Map<String, Object>) report.get("disciplinaire");
                document.add(new Paragraph("4. DISCIPLINAIRE & SANCTIONS", sectionTitleFont));
                Paragraph sub = new Paragraph("Total Sanctions du mois : " + sec.getOrDefault("total_sanctions", 0), normalFont);
                sub.setSpacingAfter(3);
                document.add(sub);

                PdfPTable table = new PdfPTable(5);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{25, 20, 30, 15, 10});

                addTableCell(table, "Agent", headerFont, headerBg, true);
                addTableCell(table, "Sanction", headerFont, headerBg, true);
                addTableCell(table, "Motif", headerFont, headerBg, true);
                addTableCell(table, "Date", headerFont, headerBg, true);
                addTableCell(table, "Statut", headerFont, headerBg, true);

                List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
                for (Map<String, Object> s : list) {
                    addTableCell(table, s.get("agent") != null ? s.get("agent").toString() : "—", normalFont, null, false);
                    addTableCell(table, s.get("type") != null ? s.get("type").toString() : "—", normalFont, null, false);
                    addTableCell(table, s.get("motif") != null ? s.get("motif").toString() : "—", normalFont, null, false);
                    addTableCell(table, s.get("date") != null ? s.get("date").toString() : "—", normalFont, null, false);
                    addTableCell(table, s.get("statut") != null ? s.get("statut").toString() : "—", normalFont, null, false);
                }
                table.setSpacingAfter(6);
                document.add(table);
            }

            if (report.containsKey("missions")) {
                Map<String, Object> sec = (Map<String, Object>) report.get("missions");
                document.add(new Paragraph("5. MISSIONS & DÉPLACEMENTS", sectionTitleFont));
                Paragraph sub = new Paragraph("Missions du mois : " + sec.getOrDefault("total_missions", 0) + "  |  En cours : " + sec.getOrDefault("en_cours", 0) + "  |  Terminées : " + sec.getOrDefault("terminees", 0), normalFont);
                sub.setSpacingAfter(3);
                document.add(sub);

                PdfPTable table = new PdfPTable(5);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{30, 25, 15, 15, 15});

                addTableCell(table, "Titre", headerFont, headerBg, true);
                addTableCell(table, "Agent", headerFont, headerBg, true);
                addTableCell(table, "Début", headerFont, headerBg, true);
                addTableCell(table, "Fin", headerFont, headerBg, true);
                addTableCell(table, "Statut", headerFont, headerBg, true);

                List<Map<String, Object>> list = (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
                for (Map<String, Object> ms : list) {
                    addTableCell(table, ms.get("titre") != null ? ms.get("titre").toString() : "—", normalFont, null, false);
                    addTableCell(table, ms.get("agent") != null ? ms.get("agent").toString() : "—", normalFont, null, false);
                    addTableCell(table, ms.get("debut") != null ? ms.get("debut").toString() : "—", normalFont, null, false);
                    addTableCell(table, ms.get("fin") != null ? ms.get("fin").toString() : "—", normalFont, null, false);
                    addTableCell(table, ms.get("statut") != null ? ms.get("statut").toString() : "—", normalFont, null, false);
                }
                table.setSpacingAfter(6);
                document.add(table);
            }

            Paragraph footer = new Paragraph("\nSimpleTaff Platform - Généré automatiquement le " + LocalDate.now(), normalFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);
            
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return ("Error generating PDF: " + e.getMessage()).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    private void addTableCell(PdfPTable table, String text, Font font, Color bgColor, boolean isHeader) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "—", font));
        cell.setPadding(2f);
        if (bgColor != null) {
            cell.setBackgroundColor(bgColor);
        }
        if (isHeader) {
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        }
        table.addCell(cell);
    }

    private Map<String, Object> pointageToMap(Pointage p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("date", p.getDateHeureEntree() != null ? p.getDateHeureEntree().toLocalDate().toString() : "—");
        map.put("heureArrivee", p.getDateHeureEntree() != null ? p.getDateHeureEntree().toLocalTime().toString() : "—");
        map.put("heureDepart", p.getDateHeureSortie() != null ? p.getDateHeureSortie().toLocalTime().toString() : "—");
        map.put("presence", (p.getDateHeureEntree() != null && p.getDateHeureSortie() != null) ? "Complet" : (p.getDateHeureEntree() != null ? "En cours" : "Absent"));
        
        String agentNom = "Agent non assigné";
        String siteTravail = "—";
        String employeur = "Système/Auto";
        
        if (p.getAffectation() != null) {
            if (p.getAffectation().getAgent() != null) {
                agentNom = getAgentNomComplet(p.getAffectation().getAgent());
            }
            if (p.getAffectation().getSiteTravail() != null && !p.getAffectation().getSiteTravail().trim().isEmpty()) {
                siteTravail = p.getAffectation().getSiteTravail();
            } else if (p.getAffectation().getZoneOperationnelle() != null && !p.getAffectation().getZoneOperationnelle().trim().isEmpty()) {
                siteTravail = p.getAffectation().getZoneOperationnelle();
            }
            
            if (p.getAffectation().getEmployeurResponsable() != null && !p.getAffectation().getEmployeurResponsable().trim().isEmpty()) {
                employeur = p.getAffectation().getEmployeurResponsable();
            } else if (p.getAffectation().getEntreprise() != null) {
                employeur = p.getAffectation().getEntreprise().getNom();
            }
        }
        
        if (p.getValideParEmployeur() != null) {
            employeur = (p.getValideParEmployeur().getNom() + " " + p.getValideParEmployeur().getPrenom()).trim();
        }

        map.put("agentNom", agentNom);
        map.put("siteTravail", siteTravail);
        map.put("employeur", employeur);
        map.put("retard", p.getDateHeureEntree() != null && p.getDateHeureEntree().toLocalTime().isAfter(LocalTime.of(8, 0)));
        map.put("dureeMinutes", calculateDurationMinutes(p));
        return map;
    }

    private String getAgentNomComplet(AgentTerrain agent) {
        if (agent == null) return "Agent non assigné";
        String nom = agent.getNom() != null ? agent.getNom() : "";
        String prenom = agent.getPrenom() != null ? agent.getPrenom() : "";
        String res = (nom + " " + prenom).trim();
        return res.isEmpty() ? "Agent Inconnu" : res;
    }

    private long calculateDurationMinutes(Pointage p) {
        if (p == null || p.getDateHeureEntree() == null || p.getDateHeureSortie() == null) {
            return 0;
        }
        return java.time.Duration.between(p.getDateHeureEntree(), p.getDateHeureSortie()).toMinutes();
    }

    private long calculateTotalDuration(List<Pointage> pointages) {
        return pointages.stream()
                .mapToLong(this::calculateDurationMinutes)
                .sum();
    }
}
