package com.siege.platform.facturation;

import com.siege.platform.paie.BulletinDePaieRepository;
import com.siege.platform.poste.Affectation;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import com.siege.platform.audit.AuditLog;
import com.siege.platform.audit.AuditLogRepository;
import com.siege.platform.notification.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

@Service
public class FactureService {

    private final FactureRepository factureRepository;
    private final BulletinDePaieRepository bulletinDePaieRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;

    public FactureService(FactureRepository factureRepository, 
                          BulletinDePaieRepository bulletinDePaieRepository,
                          AuditLogRepository auditLogRepository,
                          NotificationService notificationService) {
        this.factureRepository = factureRepository;
        this.bulletinDePaieRepository = bulletinDePaieRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public Facture genererFacture(StructureDemandeuse client, String periode, BigDecimal montant, 
                                  String rapportUrl, Set<Affectation> affectationsConcernees) {
        
        // Validation métier critique (Section 6.4) : Ordre strict impératif
        if (rapportUrl == null || rapportUrl.isBlank()) {
            throw new IllegalArgumentException("Le rapport de pointage PDF est obligatoire pour émettre la facture.");
        }

        for (Affectation aff : affectationsConcernees) {
            boolean bulletinExiste = bulletinDePaieRepository.existsByAffectationIdAndPeriode(aff.getId(), periode);
            if (!bulletinExiste) {
                throw new IllegalStateException("Impossible d'émettre la facture : Le bulletin de paie pour l'affectation " 
                        + aff.getId() + " n'a pas été clôturé pour la période " + periode);
            }
        }

        // Séquence et numérotation
        long count = factureRepository.countByPeriode(periode);
        String cleanPeriode = periode.replace("/", "-").replace(" ", "");
        String numeroFacture = "FAC-" + cleanPeriode + "-" + String.format("%04d", count + 1);

        // Calculs TVA locale (18% en Côte d'Ivoire)
        BigDecimal ht = montant;
        BigDecimal tva = ht.multiply(new BigDecimal("0.18")).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal ttc = ht.add(tva).setScale(2, java.math.RoundingMode.HALF_UP);

        Facture facture = new Facture();
        facture.setEntreprise(client.getEntreprise());
        facture.setStructureDemandeuse(client);
        facture.setPeriode(periode);
        facture.setMontantFacture(montant);
        facture.setNumeroFacture(numeroFacture);
        facture.setMontantHt(ht);
        facture.setMontantTva(tva);
        facture.setMontantTtc(ttc);
        facture.setRapportPointageUrl(rapportUrl);
        facture.setStatutPaiement("EN_ATTENTE");
        facture.setAffectations(affectationsConcernees);

        Facture saved = factureRepository.save(facture);

        // Audit Log
        AuditLog audit = new AuditLog();
        audit.setEntreprise(saved.getEntreprise());
        
        String currentEmail = "SYSTEM_FACTURATION";
        try {
            org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                currentEmail = auth.getName();
            }
        } catch (Exception e) {
            // Ignored
        }
        
        audit.setUtilisateurEmail(currentEmail);
        audit.setAction("GENERATION_FACTURE");
        audit.setModule("COMPTABILITE_FACTURE");
        audit.setCibleId(saved.getId().toString());
        audit.setDetails("Génération de la facture N° " + saved.getNumeroFacture() + " pour le client " + client.getRaisonSociale() + " (HT: " + ht + ", TVA: " + tva + ", TTC: " + ttc + ")");
        auditLogRepository.save(audit);

        // Notification
        notificationService.creerAlerte(saved.getEntreprise(), "FACTURE", "Facture client N° " + saved.getNumeroFacture() + " émise pour un montant TTC de " + ttc + " XOF.");

        return saved;
    }
}
