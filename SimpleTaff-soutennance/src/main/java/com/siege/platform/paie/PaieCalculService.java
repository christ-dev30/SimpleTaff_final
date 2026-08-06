package com.siege.platform.paie;

import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.Poste;
import com.siege.platform.prime.ReglePrimeRendement;
import com.siege.platform.prime.ReglePrimeRendementRepository;
import com.siege.platform.evaluation.EvaluationAgent;
import com.siege.platform.evaluation.EvaluationAgentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class PaieCalculService {

    private final BulletinDePaieRepository bulletinDePaieRepository;
    private final ReglePrimeRendementRepository reglePrimeRendementRepository;
    private final EvaluationAgentRepository evaluationAgentRepository;

    public PaieCalculService(BulletinDePaieRepository bulletinDePaieRepository,
                              ReglePrimeRendementRepository reglePrimeRendementRepository,
                              EvaluationAgentRepository evaluationAgentRepository) {
        this.bulletinDePaieRepository = bulletinDePaieRepository;
        this.reglePrimeRendementRepository = reglePrimeRendementRepository;
        this.evaluationAgentRepository = evaluationAgentRepository;
    }

    @Transactional
    public BulletinDePaie genererBulletin(Affectation affectation, String periode, 
                                          int joursPrevus, int joursValides, 
                                          int joursAbsJustifieeCourte, int joursAbsJustifieeLongue, 
                                          int joursAbsNonJustifiee, int joursCongePaye) {
        
        Poste poste = affectation.getPoste();
        Entreprise entreprise = affectation.getEntreprise();

        BigDecimal salaireBrutNegocie = poste.getSalaireBrutNegocie();
        BigDecimal retenueForfaitaire = poste.getMontantRetenueForfaitaire();
        
        // 1. Déduction pour absences NON JUSTIFIÉES (déduction complète)
        BigDecimal deductionNonJustifiee = retenueForfaitaire.multiply(BigDecimal.valueOf(joursAbsNonJustifiee));
        
        // 2. Déduction pour absences JUSTIFIÉES LONGUES (au-delà du seuil)
        BigDecimal deductionJustifieeLongue = BigDecimal.ZERO;
        if (joursAbsJustifieeLongue >= entreprise.getSeuilAbsenceLongueJours()) {
            BigDecimal tauxReduction = entreprise.getTauxRetenueReduite().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
            BigDecimal retenueReduiteParJour = retenueForfaitaire.multiply(tauxReduction);
            deductionJustifieeLongue = retenueReduiteParJour.multiply(BigDecimal.valueOf(joursAbsJustifieeLongue));
        }

        // 3. Salaire Brut Effectif
        BigDecimal salaireBrutEffectif = salaireBrutNegocie
                .subtract(deductionNonJustifiee)
                .subtract(deductionJustifieeLongue);
        
        if (salaireBrutEffectif.compareTo(BigDecimal.ZERO) < 0) {
            salaireBrutEffectif = BigDecimal.ZERO;
        }

        // 4. Cotisations & Retenues Légales / Conventionnelles (Retenues CNPS, CNAM, ITS)
        // Part salariale Pension / CNPS (Taux entreprise, ex: 6.3%)
        BigDecimal tauxCotisation = entreprise.getTauxCotisation().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
        BigDecimal montantPension = salaireBrutEffectif.multiply(tauxCotisation);

        // Impôt sur le traitement et salaire (ITS) - simplifié à 2%
        BigDecimal tauxITS = new BigDecimal("0.02");
        BigDecimal montantITS = salaireBrutEffectif.multiply(tauxITS);

        // Assurance maladie universelle / Complémentaire santé (CNAM) - simplifiée à 1%
        BigDecimal tauxCNAM = new BigDecimal("0.01");
        BigDecimal montantCNAM = salaireBrutEffectif.multiply(tauxCNAM);

        BigDecimal totalDeductionsSociales = montantPension.add(montantITS).add(montantCNAM);
        BigDecimal baseNetAvantPrimes = salaireBrutEffectif.subtract(totalDeductionsSociales);

        if (baseNetAvantPrimes.compareTo(BigDecimal.ZERO) < 0) {
            baseNetAvantPrimes = BigDecimal.ZERO;
        }

        // 5. Calcul automatique de la prime de rendement
        BigDecimal primeRendement = BigDecimal.ZERO;
        String primeCommentaire = "";
        try {
            List<EvaluationAgent> evals = evaluationAgentRepository.findByAgentIdOrderByAnneeDesc(affectation.getAgent().getId());
            if (evals != null && !evals.isEmpty()) {
                int score = evals.get(0).getScoreTotal();
                List<ReglePrimeRendement> regles = reglePrimeRendementRepository.findAll();
                ReglePrimeRendement regleAppliquee = null;
                for (ReglePrimeRendement r : regles) {
                    if ("ACTIF".equalsIgnoreCase(r.getStatut()) && score >= r.getSeuilMinimum()) {
                        if (regleAppliquee == null || r.getSeuilMinimum() > regleAppliquee.getSeuilMinimum()) {
                            regleAppliquee = r;
                        }
                    }
                }
                if (regleAppliquee != null) {
                    primeRendement = regleAppliquee.getMontantParPoint().multiply(BigDecimal.valueOf(score));
                    primeCommentaire = "Prime de rendement de " + primeRendement.setScale(2, RoundingMode.HALF_UP) + " FCFA basée sur le score d'évaluation de " + score + " points (" + regleAppliquee.getLibelle() + ").";
                }
            }
        } catch (Exception e) {
            System.err.println("Erreur calcul automatique de la prime de rendement: " + e.getMessage());
        }

        BigDecimal salaireNetCalcule = baseNetAvantPrimes.add(primeRendement).setScale(2, RoundingMode.HALF_UP);

        BulletinDePaie bulletin = new BulletinDePaie();
        bulletin.setEntreprise(entreprise);
        bulletin.setAgent(affectation.getAgent());
        bulletin.setAffectation(affectation);
        bulletin.setPeriode(periode);
        bulletin.setJoursPrevus(joursPrevus);
        bulletin.setJoursValides(joursValides);
        bulletin.setJoursAbsenceJustifieeCourte(joursAbsJustifieeCourte);
        bulletin.setJoursAbsenceJustifieeLongue(joursAbsJustifieeLongue);
        bulletin.setJoursAbsenceNonJustifiee(joursAbsNonJustifiee);
        bulletin.setJoursCongePaye(joursCongePaye);
        bulletin.setSalaireBrutEffectif(salaireBrutEffectif.setScale(2, RoundingMode.HALF_UP));
        bulletin.setSalaireNetCalcule(salaireNetCalcule);
        
        bulletin.setPrimeExceptionnelle(primeRendement.setScale(2, RoundingMode.HALF_UP));
        bulletin.setTotalPrimes(primeRendement.setScale(2, RoundingMode.HALF_UP));
        bulletin.setAvantagesDiversCommentaire(primeCommentaire);

        bulletin.setDateCloture(java.time.LocalDate.now());
        bulletin.setStatutPaiement("EN_ATTENTE");

        return bulletinDePaieRepository.save(bulletin);
    }
}
