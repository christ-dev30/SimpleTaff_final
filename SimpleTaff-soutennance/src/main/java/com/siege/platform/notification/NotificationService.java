package com.siege.platform.notification;

import com.siege.platform.entreprise.Entreprise;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.contrat.ContratAgent;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationEvenementRepository repository;
    private final JavaMailSender mailSender;
    private final ContratAgentRepository contratRepository;
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    public NotificationService(NotificationEvenementRepository repository, JavaMailSender mailSender, ContratAgentRepository contratRepository) {
        this.repository = repository;
        this.mailSender = mailSender;
        this.contratRepository = contratRepository;
    }

    /**
     * Create an alert and store in database
     */
    public void creerAlerte(Entreprise entreprise, String type, String message) {
        creerAlerte(entreprise, type, message, "WEBHOOK");
    }

    /**
     * Create an alert with custom channel and store in database
     */
    public void creerAlerte(Entreprise entreprise, String type, String message, String canal) {
        NotificationEvenement event = new NotificationEvenement();
        event.setEntreprise(entreprise);
        event.setType(type);
        event.setCanal(canal);
        event.setMessage(message);
        event.setStatut("A_ENVOYER");
        repository.save(event);
    }

    /**
     * Send email notification to an enterprise contact
     */
    @org.springframework.scheduling.annotation.Async("taskExecutor")
    public void envoyerEmailNotification(String destinataire, String titre, String contenu) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(destinataire);
            message.setSubject(titre);
            message.setText(contenu);
            message.setFrom("SimpleTaff <juniorehui15@gmail.com>");
            mailSender.send(message);
            logger.info("Email envoyé à {}: {}", destinataire, titre);
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi d'email à {}: {}", destinataire, e.getMessage());
        }
    }

    /**
     * Send alert and email notification
     */
    public void creerAlerteAvecEmail(Entreprise entreprise, String type, String message, String emailDestinataire) {
        String formattedMessage = "[TO:" + emailDestinataire + "] " + message;
        creerAlerte(entreprise, type, formattedMessage, "EMAIL");
    }

    /**
     * Send hourly activity alerts
     */
    public void envoyerAlerteHeureRonde(String emailAdmin, String agentName, int heure) {
        String titre = "Alerte pointage - Heure ronde";
        String contenu = "L'agent " + agentName + " a scanné sa carte à " + String.format("%02d:00", heure) + ".";
        creerAlerteAvecEmail(null, titre, contenu, emailAdmin);
    }

    /**
     * Send confirmation when agent completes their shift
     */
    public void envoyerConfirmationFinEquipe(String emailAgent, String agentName, long minutesDuree) {
        String titre = "Confirmation de fin d'équipe";
        long heures = minutesDuree / 60;
        long minutes = minutesDuree % 60;
        String contenu = String.format(
                "Bonjour %s,\n\nVotre équipe de %d heures et %d minutes a été enregistrée.\n\nCordialement,\nSimpleTaff",
                agentName, heures, minutes
        );
        creerAlerteAvecEmail(null, titre, contenu, emailAgent);
    }

    /**
     * Send late arrival notification
     */
    public void envoyerAlerteRetard(String emailAdmin, String agentName, int minutesRetard) {
        String titre = "Alerte retard";
        String contenu = "L'agent " + agentName + " est arrivé avec " + minutesRetard + " minutes de retard.";
        creerAlerteAvecEmail(null, titre, contenu, emailAdmin);
    }

    /**
     * Process pending notifications from the database queue in the background.
     * Runs every 30 seconds.
     */
    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void traiterNotificationsPendantes() {
        List<NotificationEvenement> pending = repository.findByStatut("A_ENVOYER");
        if (pending.isEmpty()) {
            return;
        }

        logger.info("Traitement de {} notifications en attente...", pending.size());
        for (NotificationEvenement notification : pending) {
            try {
                String rawMessage = notification.getMessage();
                String destinataire = "system@simpletaff.com";
                String realContent = rawMessage;

                if (rawMessage != null && rawMessage.startsWith("[TO:")) {
                    int closeBracketIdx = rawMessage.indexOf("]");
                    if (closeBracketIdx > 4) {
                        destinataire = rawMessage.substring(4, closeBracketIdx);
                        realContent = rawMessage.substring(closeBracketIdx + 1).trim();
                    }
                }

                String canal = notification.getCanal();
                if ("EMAIL".equalsIgnoreCase(canal)) {
                    SimpleMailMessage mailMessage = new SimpleMailMessage();
                    mailMessage.setTo(destinataire);
                    mailMessage.setSubject("SimpleTaff - " + notification.getType());
                    mailMessage.setText(realContent);
                    mailMessage.setFrom("SimpleTaff <juniorehui15@gmail.com>");
                    mailSender.send(mailMessage);
                    logger.info("Notification EMAIL envoyée à {}", destinataire);
                } else if ("SMS".equalsIgnoreCase(canal)) {
                    // Simulate SMS delivery via telecom API log
                    logger.info("--- ENVOI SMS SIMULÉ ---");
                    logger.info("Pour : {}", destinataire);
                    logger.info("Message : {}", realContent);
                    logger.info("-------------------------");
                } else if ("PUSH".equalsIgnoreCase(canal)) {
                    // Simulate Mobile Push Notification
                    logger.info("--- ENVOI PUSH SIMULÉ ---");
                    logger.info("Pour l'utilisateur associé à : {}", destinataire);
                    logger.info("Alerte : {}", realContent);
                    logger.info("--------------------------");
                } else {
                    // Webhook / In-App Notification
                    logger.info("Notification SYSTEM/WEBHOOK enregistrée : {}", realContent);
                }

                notification.setStatut("ENVOYE");
            } catch (Exception e) {
                logger.error("Erreur lors de l'envoi de la notification {}: {}", notification.getId(), e.getMessage());
                notification.setStatut("ECHEC");
            }
            repository.save(notification);
        }
    }

    /**
     * Check for contracts expiring in exactly 30 or 60 days, and create notifications.
     * Runs every day at 8:00 AM.
     */
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void verifierExpirationsContrats() {
        logger.info("Vérification automatique des fins de contrats...");
        
        // 30 days alert (1 month)
        java.time.LocalDate date30 = java.time.LocalDate.now().plusDays(30);
        verifierEtCreerAlerteExpiration(date30, "1 mois");

        // 60 days alert (2 months)
        java.time.LocalDate date60 = java.time.LocalDate.now().plusDays(60);
        verifierEtCreerAlerteExpiration(date60, "2 mois");
    }

    private void verifierEtCreerAlerteExpiration(java.time.LocalDate dateFin, String labelEcheance) {
        List<ContratAgent> contrats = contratRepository.findByDateFinAndStatut(dateFin, "ACTIF");
        for (ContratAgent c : contrats) {
            if (c.getAgent() == null) continue;
            String matricule = c.getAgent().getMatricule();
            String agentNom = c.getAgent().getNom() + " " + c.getAgent().getPrenom();
            
            // Build a specific message for deduplication check
            String message = "Le contrat de l'agent " + agentNom + " (" + matricule + ") expire dans " + labelEcheance + " (le " + dateFin + ").";
            
            // Deduplicate: check if this message for this enterprise and type already exists
            List<NotificationEvenement> existing = repository.findByEntrepriseIdAndTypeAndMessageContaining(
                    c.getEntreprise() != null ? c.getEntreprise().getId() : null,
                    "RH_CONTRAT_EXPIRATION",
                    matricule
            );
            
            // If already notified for this agent and this exact deadline
            boolean alreadyNotified = existing.stream().anyMatch(e -> e.getMessage().contains(labelEcheance));
            if (!alreadyNotified) {
                creerAlerte(c.getEntreprise(), "RH_CONTRAT_EXPIRATION", message);
                logger.info("Alerte expiration contrat ({}) créée pour l'agent {}", labelEcheance, agentNom);
            }
        }
    }
}
