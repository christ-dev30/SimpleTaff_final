package com.siege.platform.rapport;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.conge.DemandeConge;
import com.siege.platform.conge.DemandeCongeRepository;
import com.siege.platform.disciplinaire.Sanction;
import com.siege.platform.disciplinaire.SanctionRepository;
import com.siege.platform.materiel.Materiel;
import com.siege.platform.materiel.MaterielRepository;
import com.siege.platform.utilisateur.Utilisateur;

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
    private final com.siege.platform.paie.BulletinDePaieRepository bulletinDePaieRepository;

    private final com.siege.platform.utilisateur.UtilisateurRepository utilisateurRepository;

    public RapportService(PointageRepository pointageRepository,
                          DemandeCongeRepository demandeCongeRepository,
                          MaterielRepository materielRepository,
                          SanctionRepository sanctionRepository,
                          com.siege.platform.paie.BulletinDePaieRepository bulletinDePaieRepository,
                          com.siege.platform.utilisateur.UtilisateurRepository utilisateurRepository) {
        this.pointageRepository = pointageRepository;
        this.demandeCongeRepository = demandeCongeRepository;
        this.materielRepository = materielRepository;
        this.sanctionRepository = sanctionRepository;
        this.bulletinDePaieRepository = bulletinDePaieRepository;
        this.utilisateurRepository = utilisateurRepository;
    }

    private Utilisateur getCurrentUser() {
        String email = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        return utilisateurRepository.findByEmail(email).orElse(null);
    }
    
    private boolean agentIsInUserZone(AgentTerrain agent, Utilisateur current) {
        if (agent == null) return false;
        if (current instanceof com.siege.platform.utilisateur.Coordonnateur coord) {
            if (coord.getZone() == null) return false;
            return agent.getZone() != null && agent.getZone().getId().equals(coord.getZone().getId());
        }
        return true; // Si pas coordonnateur, ou admin, on accepte tout
    }

    public Map<String, Object> genererRapportGlobal(String mois) {
        Utilisateur current = getCurrentUser();
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();
        LocalDateTime debutDateTime = debutMois.atStartOfDay();
        LocalDateTime finDateTime = ym.plusMonths(1).atDay(1).atStartOfDay();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "RAPPORT GLOBAL MULTI-MODULES - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debutDateTime, finDateTime)
                .stream().filter(p -> agentIsInUserZone(p.getAffectation() != null ? p.getAffectation().getAgent() : null, current)).toList();
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
                .filter(c -> agentIsInUserZone(c.getAgent(), current))
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
                .filter(s -> agentIsInUserZone(s.getAgent(), current))
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

        // 5. Paie
        List<com.siege.platform.paie.BulletinDePaie> bulletins = bulletinDePaieRepository.findByEntrepriseIdAndPeriode(current.getEntreprise().getId(), mois)
                .stream()
                .filter(b -> agentIsInUserZone(b.getAgent(), current))
                .toList();
        Map<String, Object> secPaie = new LinkedHashMap<>();
        secPaie.put("total_bulletins", bulletins.size());
        java.math.BigDecimal totalBrut = bulletins.stream().map(b -> b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif() : java.math.BigDecimal.ZERO).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal totalNet = bulletins.stream().map(b -> b.getSalaireNetCalcule() != null ? b.getSalaireNetCalcule() : java.math.BigDecimal.ZERO).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        secPaie.put("total_masse_salariale", totalNet);
        secPaie.put("liste", bulletins.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agent", getAgentNomComplet(b.getAgent()));
            String metier = b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null 
                            ? b.getAffectation().getPoste().getEmploi().getLibelle() : "—";
            m.put("metier", metier);
            m.put("brut", b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif().toString() : "0");
            m.put("net", b.getSalaireNetCalcule() != null ? b.getSalaireNetCalcule().toString() : "0");
            return m;
        }).toList());
        report.put("paie", secPaie);

        return report;
    }

    public Map<String, Object> genererRapportAgent(String mois, java.util.UUID agentId) {
        Utilisateur current = getCurrentUser();
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();
        LocalDateTime debutDateTime = debutMois.atStartOfDay();
        LocalDateTime finDateTime = ym.plusMonths(1).atDay(1).atStartOfDay();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("titre", "RAPPORT AGENT - " + mois);
        report.put("dateGeneration", LocalDate.now());
        report.put("period", mois);

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debutDateTime, finDateTime)
                .stream().filter(p -> p.getAffectation() != null && p.getAffectation().getAgent() != null && p.getAffectation().getAgent().getId().equals(agentId)).toList();
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
                .filter(c -> c.getAgent() != null && c.getAgent().getId().equals(agentId))
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

        report.put("materiels", new LinkedHashMap<>());

        // 4. Disciplinaire & Sanctions
        List<Sanction> allSanctions = sanctionRepository.findAll();
        List<Sanction> sanctionsMois = allSanctions.stream()
                .filter(s -> s.getDateDecision() != null && !s.getDateDecision().isBefore(debutMois) && !s.getDateDecision().isAfter(finMois))
                .filter(s -> s.getAgent() != null && s.getAgent().getId().equals(agentId))
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

        // 5. Paie
        List<com.siege.platform.paie.BulletinDePaie> bulletins = bulletinDePaieRepository.findByEntrepriseIdAndPeriode(current.getEntreprise().getId(), mois)
                .stream()
                .filter(b -> b.getAgent() != null && b.getAgent().getId().equals(agentId))
                .toList();
        Map<String, Object> secPaie = new LinkedHashMap<>();
        secPaie.put("total_bulletins", bulletins.size());
        java.math.BigDecimal totalBrut = bulletins.stream().map(b -> b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif() : java.math.BigDecimal.ZERO).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal totalNet = bulletins.stream().map(b -> b.getSalaireNetCalcule() != null ? b.getSalaireNetCalcule() : java.math.BigDecimal.ZERO).reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        secPaie.put("total_masse_salariale", totalNet);
        secPaie.put("liste", bulletins.stream().map(b -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("agent", getAgentNomComplet(b.getAgent()));
            String metier = b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null 
                            ? b.getAffectation().getPoste().getEmploi().getLibelle() : "—";
            m.put("metier", metier);
            m.put("brut", b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif().toString() : "0");
            m.put("net", b.getSalaireNetCalcule() != null ? b.getSalaireNetCalcule().toString() : "0");
            return m;
        }).toList());
        report.put("paie", secPaie);

        return report;
    }

    public Map<String, Object> genererRapportPointages(String mois, String format) {
        Utilisateur current = getCurrentUser();
        YearMonth ym = YearMonth.parse(mois);
        LocalDateTime debut = ym.atDay(1).atStartOfDay();
        LocalDateTime fin = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debut, fin)
                .stream().filter(p -> agentIsInUserZone(p.getAffectation() != null ? p.getAffectation().getAgent() : null, current)).toList();

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
        Utilisateur current = getCurrentUser();
        YearMonth ym = YearMonth.parse(mois);
        LocalDateTime debut = ym.atDay(1).atStartOfDay();
        LocalDateTime fin = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Pointage> pointages = pointageRepository.findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(debut, fin)
                .stream().filter(p -> agentIsInUserZone(p.getAffectation() != null ? p.getAffectation().getAgent() : null, current)).toList();

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
        Utilisateur current = getCurrentUser();
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();

        List<DemandeConge> allConges = demandeCongeRepository.findAll();
        List<DemandeConge> congesMois = allConges.stream()
                .filter(c -> c.getDateDebut() != null && !c.getDateDebut().isBefore(debutMois) && !c.getDateDebut().isAfter(finMois))
                .filter(c -> agentIsInUserZone(c.getAgent(), current))
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
        Utilisateur current = getCurrentUser();
        YearMonth ym = YearMonth.parse(mois);
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();

        List<Sanction> allSanctions = sanctionRepository.findAll();
        List<Sanction> sanctionsMois = allSanctions.stream()
                .filter(s -> s.getDateDecision() != null && !s.getDateDecision().isBefore(debutMois) && !s.getDateDecision().isAfter(finMois))
                .filter(s -> agentIsInUserZone(s.getAgent(), current))
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


    /**
     * Generates a structured PDF presence report with one page per agent per week,
     * matching the "Feuille de Pointage Hebdomadaire Individuelle" format.
     */
    @SuppressWarnings("unchecked")
    public byte[] exportPresencesToPdf(String mois, List<Pointage> pointages) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A3.rotate(), 28, 28, 36, 28);
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 13, new Color(18, 49, 46));
            Font headerFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,  Color.WHITE);
            Font normalFont  = FontFactory.getFont(FontFactory.HELVETICA,      7,  new Color(18, 49, 46));
            Font boldFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,  new Color(18, 49, 46));
            Font smallFont   = FontFactory.getFont(FontFactory.HELVETICA,      6,  new Color(100,116,139));
            Font dayFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7,  new Color(18, 49, 46));

            Color headerBg   = new Color(18, 49, 46); // #12312E
            Color altRowBg   = new Color(241, 245, 249); // C_ALT
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
                        String empIdStr = aff.getEmployeurResponsable();
                        try {
                            java.util.UUID empId = java.util.UUID.fromString(empIdStr);
                            com.siege.platform.utilisateur.Utilisateur u = utilisateurRepository.findById(empId).orElse(null);
                            if (u != null) {
                                agentEmployeur = (u.getNom() + " " + u.getPrenom()).trim();
                            } else {
                                agentEmployeur = empIdStr;
                            }
                        } catch (Exception e) {
                            agentEmployeur = empIdStr;
                        }
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
                            if (p.getAffectation().getEmployeurResponsable() != null && !p.getAffectation().getEmployeurResponsable().trim().isEmpty()) {
                                String empIdStr = p.getAffectation().getEmployeurResponsable();
                                try {
                                    java.util.UUID empId = java.util.UUID.fromString(empIdStr);
                                    com.siege.platform.utilisateur.Utilisateur u = utilisateurRepository.findById(empId).orElse(null);
                                    if (u != null) employeur = (u.getNom() + " " + u.getPrenom()).trim();
                                    else employeur = empIdStr;
                                } catch (Exception e) { employeur = empIdStr; }
                            } else if (p.getAffectation().getEntreprise() != null) {
                                employeur = p.getAffectation().getEntreprise().getNom();
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
        String period = (String) report.getOrDefault("period", LocalDate.now().toString());
        return RapportPdfBuilder.build(report, period);
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
                String empIdStr = p.getAffectation().getEmployeurResponsable();
                try {
                    java.util.UUID empId = java.util.UUID.fromString(empIdStr);
                    com.siege.platform.utilisateur.Utilisateur u = utilisateurRepository.findById(empId).orElse(null);
                    if (u != null) {
                        employeur = (u.getNom() + " " + u.getPrenom()).trim();
                    } else {
                        employeur = empIdStr;
                    }
                } catch (IllegalArgumentException e) {
                    employeur = empIdStr;
                }
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
