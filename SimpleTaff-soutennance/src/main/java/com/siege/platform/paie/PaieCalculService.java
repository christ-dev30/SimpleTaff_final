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

        // Primes fixes (Mock pour la soutenance -> dynamiques maintenant)
        BigDecimal primeTransport = parametre.getPrimeTransport();
        BigDecimal primeLogement = parametre.getPrimeLogement();
        BigDecimal primeRendement = parametre.getPrimeRendement();
        BigDecimal totalPrimes = primeTransport.add(primeLogement).add(primeRendement);

        // Assiette de cotisation = Brut + Primes imposables (on simplifie ici)
        BigDecimal assiette = salaireBrutEffectif.add(totalPrimes);

        // Calcul des cotisations et impôts
        BigDecimal cnps = assiette.multiply(parametre.getTauxCnps()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cnam = assiette.multiply(parametre.getTauxCnam()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal impot = assiette.multiply(parametre.getTauxImpot()).setScale(2, RoundingMode.HALF_UP);

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
