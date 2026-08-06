package com.siege.platform.scheduler;

import com.siege.platform.agent.PieceJustificative;
import com.siege.platform.agent.PieceJustificativeRepository;
import com.siege.platform.contrat.ContratAgent;
import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.notification.NotificationService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
public class ExpirationScheduler {
    private final PieceJustificativeRepository pieceRepository;
    private final ContratAgentRepository contratRepository;
    private final NotificationService notificationService;

    public ExpirationScheduler(PieceJustificativeRepository pieceRepository,
                               ContratAgentRepository contratRepository,
                               NotificationService notificationService) {
        this.pieceRepository = pieceRepository;
        this.contratRepository = contratRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 7 * * *")
    public void scannerExpirations() {
        LocalDate today = LocalDate.now();
        LocalDate limit = today.plusDays(30);
        for (PieceJustificative piece : pieceRepository.findByDateExpirationBetween(today, limit)) {
            piece.setStatut("A_EXPIRER");
            piece.setAlerteEnvoyeeLe(today);
            pieceRepository.save(piece);
            notificationService.creerAlerte(piece.getAgent().getEntreprise(), "DOCUMENT_EXPIRATION", "Document a renouveler: " + piece.getType());
        }

        // Alert 2 months before (exactly J-60)
        LocalDate twoMonthsMin = today.plusDays(60);
        LocalDate twoMonthsMax = today.plusDays(61);
        for (ContratAgent contrat : contratRepository.findByDateFinBetweenAndStatut(twoMonthsMin, twoMonthsMax, "ACTIF")) {
            notificationService.creerAlerte(contrat.getEntreprise(), "CONTRAT_EXPIRATION", 
                "Alerte Contrat J-60 : Le contrat de l'agent " + contrat.getAgent().getNom() + " " + contrat.getAgent().getPrenom() + " expire dans 2 mois (le " + contrat.getDateFin() + ")");
        }

        // Alert 1 month before (exactly J-30)
        LocalDate oneMonthMin = today.plusDays(30);
        LocalDate oneMonthMax = today.plusDays(31);
        for (ContratAgent contrat : contratRepository.findByDateFinBetweenAndStatut(oneMonthMin, oneMonthMax, "ACTIF")) {
            notificationService.creerAlerte(contrat.getEntreprise(), "CONTRAT_EXPIRATION", 
                "Alerte Contrat J-30 : Le contrat de l'agent " + contrat.getAgent().getNom() + " " + contrat.getAgent().getPrenom() + " expire dans 1 mois (le " + contrat.getDateFin() + ")");
        }
    }
}
