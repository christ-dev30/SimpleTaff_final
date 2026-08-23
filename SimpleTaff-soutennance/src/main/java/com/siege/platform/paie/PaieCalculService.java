package com.siege.platform.paie;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.agent.AgentTerrainRepository;
import com.siege.platform.contrat.ContratAgent;
import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private CurrentTenantService tenantService;

    // Taux de cotisations par défaut (soutenance)
    private static final BigDecimal TAUX_CNPS = new BigDecimal("0.063"); // 6.3%
    private static final BigDecimal TAUX_CNAM = new BigDecimal("0.01");  // 1%
    private static final BigDecimal TAUX_IMPOT = new BigDecimal("0.02"); // 2% simplifié

    @Transactional
    public BulletinDePaie calculerEtGenererBulletin(PaieRequest request) {
        Entreprise entreprise = tenantService.entreprise();
        
        AgentTerrain agent = agentRepository.findById(request.getAgentId())
                .orElseThrow(() -> new RuntimeException("Agent introuvable"));

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

        // Primes fixes (Mock pour la soutenance)
        BigDecimal primeTransport = new BigDecimal("15000.00");
        BigDecimal primeLogement = new BigDecimal("10000.00");
        BigDecimal primeRendement = new BigDecimal("5000.00");
        BigDecimal totalPrimes = primeTransport.add(primeLogement).add(primeRendement);

        // Assiette de cotisation = Brut + Primes imposables (on simplifie ici)
        BigDecimal assiette = salaireBrutEffectif.add(totalPrimes);

        // Calcul des cotisations et impôts
        BigDecimal cnps = assiette.multiply(TAUX_CNPS).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cnam = assiette.multiply(TAUX_CNAM).setScale(2, RoundingMode.HALF_UP);
        BigDecimal impot = assiette.multiply(TAUX_IMPOT).setScale(2, RoundingMode.HALF_UP);

        // Calcul final net
        BigDecimal totalDeductions = cnps.add(cnam).add(impot);
        BigDecimal salaireNet = assiette.subtract(totalDeductions).setScale(2, RoundingMode.HALF_UP);

        // Enregistrement
        BulletinDePaie bulletin = new BulletinDePaie();
        bulletin.setEntreprise(entreprise);
        bulletin.setAgent(agent);
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

        // Si un bulletin existe déjà pour cette période, on le remplace
        Optional<BulletinDePaie> existant = bulletinRepository.findByAgentIdAndPeriode(agent.getId(), request.getPeriode());
        existant.ifPresent(b -> bulletin.setId(b.getId()));

        return bulletinRepository.save(bulletin);
    }
}
