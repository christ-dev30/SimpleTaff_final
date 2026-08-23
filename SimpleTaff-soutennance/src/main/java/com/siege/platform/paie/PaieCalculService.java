package com.siege.platform.paie;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.contrat.ContratAgent;
import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.siege.platform.disciplinaire.SanctionRepository;
import java.time.YearMonth;
import java.time.LocalDate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaieCalculService {

    @Autowired
    private BulletinDePaieRepository bulletinRepository;

    @Autowired
    private AgentTerrainRepository agentRepository;

    @Autowired
    private ContratAgentRepository contratRepository;

    @Autowired
    private AffectationRepository affectationRepository;

    @Autowired
    private ParametrePaieRepository parametreRepository;

    @Autowired
    private CurrentTenantService tenantService;
    
    @Autowired
    private SanctionRepository sanctionRepository;

    @Transactional
    public BulletinDePaie calculerEtGenererBulletin(PaieRequest request) {
        Entreprise entreprise = tenantService.entreprise();
        
        AgentTerrain agent = agentRepository.findById(request.getAgentId())
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));

        // Récupération de l'affectation active (ou la dernière)
        Affectation affectation = affectationRepository.findByAgentIdOrderByDateDebutOccupationDesc(agent.getId())
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("L'agent n'a aucune affectation."));

        // Récupération du salaire de base via le contrat actif
        List<ContratAgent> contrats = contratRepository.findByAgentIdOrderByDateDebutDesc(agent.getId());
        BigDecimal salaireBase = contrats.stream()
                .filter(c -> "ACTIF".equals(c.getStatut()))
                .map(ContratAgent::getSalaireBase)
                .findFirst()
                .orElse(new BigDecimal("100000.00")); // Valeur par défaut si aucun salaire

        // Proratisation du salaire brut
        BigDecimal salaireBrutEffectif = salaireBase;
        if (request.getJoursPrevus() > 0 && request.getJoursValides() < request.getJoursPrevus()) {
            BigDecimal fraction = BigDecimal.valueOf(request.getJoursValides())
                    .divide(BigDecimal.valueOf(request.getJoursPrevus()), 4, RoundingMode.HALF_UP);
            salaireBrutEffectif = salaireBase.multiply(fraction);
        }

        // Retenue pour absences injustifiées (jours secs)
        BigDecimal retenueAbsence = BigDecimal.ZERO;
        if (request.getJoursAbsenceNonJustifiee() > 0 && request.getJoursPrevus() > 0) {
             BigDecimal valeurJour = salaireBase.divide(BigDecimal.valueOf(request.getJoursPrevus()), 4, RoundingMode.HALF_UP);
             retenueAbsence = valeurJour.multiply(BigDecimal.valueOf(request.getJoursAbsenceNonJustifiee()));
             salaireBrutEffectif = salaireBrutEffectif.subtract(retenueAbsence);
        }

        // Récupération des paramètres de paie
        ParametrePaie parametre = parametreRepository.findByEntrepriseId(entreprise.getId())
                .orElse(new ParametrePaie()); // valeurs par défaut dans l'entité

        // Primes fixes (Mock pour la soutenance -> 15000 comme demandé, sans avantages)
        BigDecimal primeTransport = new BigDecimal("15000.00"); // Forcé pour la soutenance
        BigDecimal primeLogement = BigDecimal.ZERO; // Retiré
        BigDecimal primeRendement = BigDecimal.ZERO; // Retiré
        BigDecimal totalPrimes = primeTransport.add(primeLogement).add(primeRendement);
        
        // Règle Métier : Perte de primes si >= 2 jours absence injustifiée OU >= 1 sanction dans le mois
        YearMonth ym = YearMonth.parse(request.getPeriode());
        LocalDate debutMois = ym.atDay(1);
        LocalDate finMois = ym.atEndOfMonth();
        
        long nombreSanctions = sanctionRepository.countByAgentIdAndDateDecisionBetween(agent.getId(), debutMois, finMois);
        
        if (request.getJoursAbsenceNonJustifiee() >= 2 || nombreSanctions >= 1) {
            totalPrimes = BigDecimal.ZERO; // Perte totale des primes
            // Alternativement, on pourrait ne mettre à zéro que primeRendement. 
            // Ici on annule tout selon la demande "les primes ne s'appliquent pas".
        }

        // Assiette de cotisation = Brut + Primes imposables (on simplifie ici)
        BigDecimal assiette = salaireBrutEffectif.add(totalPrimes);

        // Calcul des cotisations (et impôts fixé à zéro)
        BigDecimal cnps = assiette.multiply(parametre.getTauxCnps()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cnam = assiette.multiply(parametre.getTauxCnam()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal impot = BigDecimal.ZERO;

        // Calcul final net
        BigDecimal totalDeductions = cnps.add(cnam).add(impot);
        BigDecimal salaireNet = assiette.subtract(totalDeductions).setScale(2, RoundingMode.HALF_UP);

        // Enregistrement
        BulletinDePaie bulletin = new BulletinDePaie();
        bulletin.setEntreprise(entreprise);
        bulletin.setAgent(agent);
        bulletin.setAffectation(affectation);
        bulletin.setPeriode(request.getPeriode());
        bulletin.setJoursPrevus(request.getJoursPrevus());
        bulletin.setJoursValides(request.getJoursValides());
        bulletin.setJoursAbsenceNonJustifiee(request.getJoursAbsenceNonJustifiee());
        bulletin.setSalaireDeBase(salaireBase);
        bulletin.setSalaireBrutEffectif(salaireBrutEffectif);
        bulletin.setRetenueAbsence(retenueAbsence);
        bulletin.setPrimeTransport(primeTransport);
        bulletin.setPrimeLogement(primeLogement);
        bulletin.setPrimeRendement(primeRendement);
        bulletin.setTotalPrimes(totalPrimes);
        bulletin.setCotisationCnps(cnps);
        bulletin.setCotisationCnam(cnam);
        bulletin.setImpotSurRevenu(impot);
        bulletin.setSalaireNetCalcule(salaireNet);
        bulletin.setCreeLe(java.time.LocalDateTime.now());
        bulletin.setDateCloture(java.time.LocalDateTime.now());

        // Si un bulletin existe déjà pour cette période, on le remplace
        Optional<BulletinDePaie> existant = bulletinRepository.findByAgentIdAndPeriode(agent.getId(), request.getPeriode());
        existant.ifPresent(b -> {
            bulletin.setId(b.getId());
            bulletin.setCreeLe(b.getCreeLe() != null ? b.getCreeLe() : java.time.LocalDateTime.now());
        });

        return bulletinRepository.save(bulletin);
    }
}
