package com.siege.platform.dashboard;

import com.siege.platform.config.security.JwtUtils;
import com.siege.platform.facturation.Facture;
import com.siege.platform.facturation.FactureRepository;
import com.siege.platform.facturation.FactureService;
import com.siege.platform.paie.BulletinDePaie;
import com.siege.platform.paie.BulletinDePaieRepository;
import com.siege.platform.paie.PaieCalculService;
import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import com.siege.platform.structuredemandeuse.StructureDemandeuseRepository;
import com.siege.platform.utilisateur.UtilisateurRepository;
import com.siege.platform.audit.AuditLog;
import com.siege.platform.audit.AuditLogRepository;
import com.siege.platform.notification.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/paie")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class PaieController {

    private final BulletinDePaieRepository bulletinRepo;
    private final FactureRepository factureRepo;
    private final AffectationRepository affectationRepo;
    private final PaieCalculService paieCalculService;
    private final FactureService factureService;
    private final StructureDemandeuseRepository structureRepo;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;

    public PaieController(BulletinDePaieRepository bulletinRepo,
                          FactureRepository factureRepo,
                          AffectationRepository affectationRepo,
                          PaieCalculService paieCalculService,
                          FactureService factureService,
                          StructureDemandeuseRepository structureRepo,
                          AuditLogRepository auditLogRepository,
                          NotificationService notificationService) {
        this.bulletinRepo = bulletinRepo;
        this.factureRepo = factureRepo;
        this.affectationRepo = affectationRepo;
        this.paieCalculService = paieCalculService;
        this.factureService = factureService;
        this.structureRepo = structureRepo;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
    }


    /** Liste tous les bulletins de paie (filtrés par tenant via Hibernate Filter) */
    @GetMapping("/bulletins")
    public ResponseEntity<List<Map<String, Object>>> getBulletins() {
        List<BulletinDePaie> bulletins = bulletinRepo.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (BulletinDePaie b : bulletins) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", b.getId());
            m.put("periode", b.getPeriode());
            m.put("agentNom", b.getAgent() != null ? b.getAgent().getNom() + " " + b.getAgent().getPrenom() : "—");
            m.put("salaireBrutEffectif", b.getSalaireBrutEffectif());
            m.put("salaireNetCalcule", b.getSalaireNetCalcule());
            m.put("totalPrimes", b.getTotalPrimes());
            m.put("statutPaiement", b.getStatutPaiement());
            m.put("dateCloture", b.getDateCloture() != null ? b.getDateCloture().toString() : "—");
            m.put("joursValides", b.getJoursValides());
            m.put("joursAbsNonJust", b.getJoursAbsenceNonJustifiee());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /** Génère un bulletin de paie manuellement pour une affectation */
    @PostMapping("/bulletins/generer")
    public ResponseEntity<?> genererBulletin(@RequestBody Map<String, Object> payload) {
        try {
            UUID affectationId = UUID.fromString((String) payload.get("affectationId"));
            Affectation affectation = affectationRepo.findById(affectationId)
                    .orElseThrow(() -> new RuntimeException("Affectation introuvable."));
            String periode = (String) payload.get("periode");
            int joursPrevus = ((Number) payload.get("joursPrevus")).intValue();
            int joursValides = ((Number) payload.get("joursValides")).intValue();
            int joursAbsJustCourte = payload.containsKey("joursAbsJustCourte") ? ((Number) payload.get("joursAbsJustCourte")).intValue() : 0;
            int joursAbsJustLongue = payload.containsKey("joursAbsJustLongue") ? ((Number) payload.get("joursAbsJustLongue")).intValue() : 0;
            int joursAbsNonJust = payload.containsKey("joursAbsNonJust") ? ((Number) payload.get("joursAbsNonJust")).intValue() : 0;
            int joursCongePaye = payload.containsKey("joursCongePaye") ? ((Number) payload.get("joursCongePaye")).intValue() : 0;

            BulletinDePaie bulletin = paieCalculService.genererBulletin(
                    affectation, periode, joursPrevus, joursValides,
                    joursAbsJustCourte, joursAbsJustLongue, joursAbsNonJust, joursCongePaye);
            appliquerPrimes(bulletin, payload);
            bulletinRepo.save(bulletin);

            return ResponseEntity.ok(Map.of(
                    "message", "Bulletin généré !",
                    "id", bulletin.getId(),
                    "salaireNet", bulletin.getSalaireNetCalcule()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    private void appliquerPrimes(BulletinDePaie bulletin, Map<String, Object> payload) {
        java.math.BigDecimal transport = decimal(payload.get("primeTransport"));
        java.math.BigDecimal logement = decimal(payload.get("primeLogement"));
        java.math.BigDecimal terrain = decimal(payload.get("primeTerrain"));
        java.math.BigDecimal communication = decimal(payload.get("primeCommunication"));
        java.math.BigDecimal panier = decimal(payload.get("primePanier"));
        java.math.BigDecimal anciennete = decimal(payload.get("primeAnciennete"));
        java.math.BigDecimal exceptionnelle = decimal(payload.get("primeExceptionnelle"));
        java.math.BigDecimal total = transport.add(logement).add(terrain).add(communication).add(panier).add(anciennete).add(exceptionnelle);

        bulletin.setPrimeTransport(transport);
        bulletin.setPrimeLogement(logement);
        bulletin.setPrimeTerrain(terrain);
        bulletin.setPrimeCommunication(communication);
        bulletin.setPrimePanier(panier);
        bulletin.setPrimeAnciennete(anciennete);
        bulletin.setPrimeExceptionnelle(exceptionnelle);
        bulletin.setTotalPrimes(total);
        bulletin.setAvantagesDiversCommentaire((String) payload.get("avantagesDiversCommentaire"));
        bulletin.setSalaireNetCalcule(bulletin.getSalaireNetCalcule().add(total));
    }

    private java.math.BigDecimal decimal(Object value) {
        if (value == null || value.toString().isBlank()) {
            return java.math.BigDecimal.ZERO;
        }
        return new java.math.BigDecimal(value.toString());
    }

    /** Liste toutes les factures */
    @GetMapping("/factures")
    public ResponseEntity<List<Map<String, Object>>> getFactures() {
        List<Facture> factures = factureRepo.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Facture f : factures) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("numeroFacture", f.getNumeroFacture());
            m.put("periode", f.getPeriode());
            m.put("clientNom", f.getStructureDemandeuse() != null ? f.getStructureDemandeuse().getRaisonSociale() : "—");
            m.put("montantFacture", f.getMontantFacture());
            m.put("montantHt", f.getMontantHt());
            m.put("montantTva", f.getMontantTva());
            m.put("montantTtc", f.getMontantTtc());
            m.put("statutPaiement", f.getStatutPaiement());
            m.put("dateEmission", f.getDateEmission() != null ? f.getDateEmission().toString() : "—");
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    /** Marque un bulletin comme payé */
    @PostMapping("/bulletins/{id}/payer")
    public ResponseEntity<?> payerBulletin(@PathVariable("id") UUID id) {
        return bulletinRepo.findById(id).map(b -> {
            b.setStatutPaiement("PAYE");
            bulletinRepo.save(b);

            // Audit Log
            AuditLog audit = new AuditLog();
            audit.setEntreprise(b.getEntreprise());
            audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
            audit.setAction("PAIEMENT_BULLETIN");
            audit.setModule("COMPTABILITE_PAIE");
            audit.setCibleId(b.getId().toString());
            audit.setDetails("Paiement du bulletin de paie de l'agent " + (b.getAgent() != null ? b.getAgent().getNom() + " " + b.getAgent().getPrenom() : "N/A") + " pour la période : " + b.getPeriode());
            auditLogRepository.save(audit);

            // Notification
            notificationService.creerAlerte(b.getEntreprise(), "PAIE", "Bulletin de paie de l'agent " + (b.getAgent() != null ? b.getAgent().getNom() : "N/A") + " marqué comme payé.");

            return ResponseEntity.ok(Map.of("message", "Bulletin marqué comme payé."));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Marque une facture comme payée */
    @PostMapping("/factures/{id}/payer")
    public ResponseEntity<?> payerFacture(@PathVariable("id") UUID id) {
        return factureRepo.findById(id).map(f -> {
            f.setStatutPaiement("PAYE");
            factureRepo.save(f);

            // Audit Log
            AuditLog audit = new AuditLog();
            audit.setEntreprise(f.getEntreprise());
            audit.setUtilisateurEmail(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());
            audit.setAction("PAIEMENT_FACTURE");
            audit.setModule("COMPTABILITE_FACTURE");
            audit.setCibleId(f.getId().toString());
            audit.setDetails("Paiement enregistré pour la facture N° " + f.getNumeroFacture() + " du client " + (f.getStructureDemandeuse() != null ? f.getStructureDemandeuse().getRaisonSociale() : "N/A"));
            auditLogRepository.save(audit);

            // Notification
            notificationService.creerAlerte(f.getEntreprise(), "FACTURE", "Facture N° " + f.getNumeroFacture() + " marquée comme payée.");

            return ResponseEntity.ok(Map.of("message", "Facture marquée comme payée."));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** Génère une facture client */
    @PostMapping("/factures/generer")
    public ResponseEntity<?> genererFacture(@RequestBody Map<String, Object> payload) {
        try {
            UUID structureId = UUID.fromString((String) payload.get("structureId"));
            String periode = (String) payload.get("periode");
            String rapportUrl = (String) payload.get("rapportUrl");
            if (rapportUrl == null || rapportUrl.isBlank()) {
                rapportUrl = "/rapports/rapport_" + structureId + "_" + periode + ".pdf"; // Simulated PDF
            }
            java.math.BigDecimal montant = new java.math.BigDecimal(payload.get("montant").toString());

            StructureDemandeuse client = structureRepo.findById(structureId)
                    .orElseThrow(() -> new RuntimeException("Structure cliente introuvable."));

            List<Affectation> all = affectationRepo.findAll();
            Set<Affectation> affectationsConcernees = new HashSet<>();
            for (Affectation a : all) {
                if (a.getPoste() != null && a.getPoste().getSite() != null &&
                    a.getPoste().getSite().getStructureDemandeuse() != null &&
                    a.getPoste().getSite().getStructureDemandeuse().getId().equals(structureId)) {
                    affectationsConcernees.add(a);
                }
            }

            if (affectationsConcernees.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Aucune affectation active pour ce client."));
            }

            Facture facture = factureService.genererFacture(client, periode, montant, rapportUrl, affectationsConcernees);
            return ResponseEntity.ok(Map.of(
                    "message", "Facture générée avec succès !",
                    "id", facture.getId(),
                    "montant", facture.getMontantFacture()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
