package com.siege.platform.invitation;

import com.siege.platform.common.enums.FormuleAbonnement;
import com.siege.platform.common.enums.StatutUtilisateur;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.entreprise.EntrepriseRepository;
import com.siege.platform.utilisateur.AdminEntreprise;
import com.siege.platform.utilisateur.UtilisateurRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class InvitationService {

    private final InvitationEntrepriseRepository invitationRepository;
    private final EntrepriseRepository entrepriseRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final JavaMailSender mailSender;
    private final PasswordEncoder passwordEncoder;
    private final com.siege.platform.notification.NotificationService notificationService;

    public InvitationService(
            InvitationEntrepriseRepository invitationRepository,
            EntrepriseRepository entrepriseRepository,
            UtilisateurRepository utilisateurRepository,
            JavaMailSender mailSender,
            PasswordEncoder passwordEncoder,
            com.siege.platform.notification.NotificationService notificationService) {
        this.invitationRepository = invitationRepository;
        this.entrepriseRepository = entrepriseRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.mailSender = mailSender;
        this.passwordEncoder = passwordEncoder;
        this.notificationService = notificationService;
    }

    /**
     * Crée une entreprise (si non existante), génère un token unique et envoie le lien par email.
     */
    @Transactional
    public InvitationEntreprise creerEtEnvoyerInvitation(String nomEntreprise, String formuleStr,
                                                          double tauxCotisation, String emailDestinataire) {
        // Créer ou retrouver l'entreprise
        Entreprise entreprise = new Entreprise();
        entreprise.setNom(nomEntreprise);
        try {
            entreprise.setFormuleAbonnement(FormuleAbonnement.valueOf(formuleStr));
        } catch (IllegalArgumentException e) {
            entreprise.setFormuleAbonnement(FormuleAbonnement.PRO);
        }
        entreprise.setTauxCotisation(new java.math.BigDecimal(String.valueOf(tauxCotisation)));
        entreprise.setStatut(com.siege.platform.common.enums.StatutEntreprise.INACTIF); // inactif jusqu'à inscription
        Entreprise savedEntreprise = entrepriseRepository.save(entreprise);

        // Générer un token unique
        String token = UUID.randomUUID().toString().replace("-", "");

        InvitationEntreprise invitation = new InvitationEntreprise();
        invitation.setToken(token);
        invitation.setEmailDestinataire(emailDestinataire);
        invitation.setEntreprise(savedEntreprise);
        invitation.setFormuleAbonnement(savedEntreprise.getFormuleAbonnement());
        InvitationEntreprise savedInvitation = invitationRepository.save(invitation);

        // Envoyer l'email avec un lien générique (ou basé sur une variable d'environnement)
        String baseUrl = System.getenv("APP_URL");
        if (baseUrl == null || baseUrl.isEmpty()) {
            baseUrl = "https://simpletafffinal-production.up.railway.app";
        }
        String lien = baseUrl + "/vitrine/inscription.html?token=" + token;
        envoyerEmailInvitation(emailDestinataire, nomEntreprise, lien, savedEntreprise.getFormuleAbonnement().name());

        return savedInvitation;
    }

    /**
     * Valide un token : vérifie qu'il existe, n'est pas utilisé et n'est pas expiré.
     */
    public InvitationEntreprise validerToken(String token) {
        InvitationEntreprise invitation = invitationRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Lien d'invitation invalide ou introuvable."));

        if (invitation.isUtilise()) {
            throw new RuntimeException("Ce lien d'invitation a déjà été utilisé.");
        }
        if (LocalDateTime.now().isAfter(invitation.getDateExpiration())) {
            throw new RuntimeException("Ce lien d'invitation a expiré (validité 30 minutes).");
        }
        return invitation;
    }

    /**
     * Finalise l'inscription de l'admin entreprise via le token d'invitation.
     */
    @Transactional
    public void inscrireAdminEntreprise(String token, String nom, String prenom, String password) {
        InvitationEntreprise invitation = validerToken(token);

        // Créer l'utilisateur AdminEntreprise
        AdminEntreprise admin = new AdminEntreprise();
        admin.setNom(nom);
        admin.setPrenom(prenom);
        admin.setEmail(invitation.getEmailDestinataire());
        admin.setMotDePasseHash(passwordEncoder.encode(password));
        admin.setStatut(StatutUtilisateur.ACTIF);
        admin.setEntreprise(invitation.getEntreprise());
        utilisateurRepository.save(admin);

        // Activer l'entreprise
        Entreprise entreprise = invitation.getEntreprise();
        entreprise.setStatut(com.siege.platform.common.enums.StatutEntreprise.ACTIF);
        entrepriseRepository.save(entreprise);

        // Marquer le token comme utilisé
        invitation.setUtilise(true);
        invitationRepository.save(invitation);
        
        // Envoyer une notification au super admin
        notificationService.creerAlerte(entreprise, "SUPER_ADMIN", "L'entreprise " + entreprise.getNom() + " a finalisé son inscription (Abonnement Actif).");
    }

    @org.springframework.scheduling.annotation.Async("taskExecutor")
    public void envoyerEmailInvitation(String destinataire, String nomEntreprise, String lien, String formule) {
        try {
            System.out.println("[InvitationService] Démarrage de l'envoi de l'email à " + destinataire + " via l'API REST de Brevo...");
            
            String apiKey = System.getenv("MAIL_PASSWORD");
            if (apiKey == null || apiKey.isEmpty()) {
                System.err.println("[InvitationService] ERREUR: La clé API Brevo (MAIL_PASSWORD) n'est pas définie dans les variables d'environnement.");
                return;
            }
            
            String htmlContent = "<!DOCTYPE html>"
                + "<html lang='fr'>"
                + "<head>"
                + "  <meta charset='utf-8'>"
                + "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                + "  <style>"
                + "    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');"
                + "    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f3f4f6; color: #1f2937; margin: 0; padding: 0; }"
                + "    .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-top: 40px; padding-bottom: 40px; }"
                + "    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }"
                + "    .header { background: linear-gradient(135deg, #2563eb, #0ea5e9); padding: 40px 32px; text-align: center; }"
                + "    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }"
                + "    .header p { color: #e0f2fe; margin-top: 8px; font-size: 16px; font-weight: 500; }"
                + "    .content { padding: 48px 40px; line-height: 1.7; font-size: 16px; }"
                + "    .welcome { font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 24px; }"
                + "    .text-body { color: #4b5563; margin-bottom: 32px; }"
                + "    .info-card { margin: 32px 0; padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }"
                + "    .info-row { display: block; margin-bottom: 12px; font-size: 15px; }"
                + "    .info-row:last-child { margin-bottom: 0; }"
                + "    .info-label { color: #64748b; font-weight: 500; display: inline-block; width: 140px; }"
                + "    .info-value { color: #0f172a; font-weight: 700; }"
                + "    .badge { background-color: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 700; display: inline-block; }"
                + "    .cta-container { text-align: center; margin: 40px 0 32px; }"
                + "    .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 16px 36px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: all 0.2s; }"
                + "    .warning { font-size: 14px; color: #9a3412; background-color: #fff7ed; border-left: 4px solid #f97316; padding: 16px; border-radius: 0 8px 8px 0; margin-top: 32px; }"
                + "    .footer { background-color: #f8fafc; padding: 32px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; }"
                + "    .footer a { color: #64748b; text-decoration: underline; }"
                + "  </style>"
                + "</head>"
                + "<body>"
                + "  <div class='wrapper'>"
                + "    <div class='container'>"
                + "      <div class='header'>"
                + "        <h1>SimpleTaff</h1>"
                + "        <p>Gestion simplifiée de votre main-d'œuvre</p>"
                + "      </div>"
                + "      <div class='content'>"
                + "        <p class='welcome'>Bonjour,</p>"
                + "        <p class='text-body'>L'équipe de <strong>SimpleTaff</strong> a le plaisir de vous inviter à configurer votre espace administrateur. Tout est prêt pour vous permettre de gérer votre entreprise efficacement.</p>"
                + "        <div class='info-card'>"
                + "          <div class='info-row'>"
                + "            <span class='info-label'>Entreprise :</span>"
                + "            <span class='info-value'>" + nomEntreprise + "</span>"
                + "          </div>"
                + "          <div class='info-row'>"
                + "            <span class='info-label'>Abonnement :</span>"
                + "            <span class='info-value'><span class='badge'>" + formule + "</span></span>"
                + "          </div>"
                + "        </div>"
                + "        <p class='text-body' style='text-align: center; font-weight: 500; color: #1f2937;'>Cliquez sur le bouton ci-dessous pour finaliser votre inscription :</p>"
                + "        <div class='cta-container'>"
                + "          <a href='" + lien + "' class='cta-button'>Configurer mon espace</a>"
                + "        </div>"
                + "        <div class='warning'>"
                + "          <strong>⏳ Attention :</strong> Pour des raisons de sécurité, ce lien d'activation est unique et <strong>expirera dans 30 minutes</strong>."
                + "        </div>"
                + "      </div>"
                + "      <div class='footer'>"
                + "        <p>Cet e-mail a été généré automatiquement, merci de ne pas y répondre directement.</p>"
                + "        <p>&copy; 2026 SimpleTaff. Tous droits réservés.</p>"
                + "      </div>"
                + "    </div>"
                + "  </div>"
                + "</body>"
                + "</html>";
                
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("api-key", apiKey);
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("sender", java.util.Map.of("name", "SimpleTaff", "email", "juniorehui15@gmail.com"));
            body.put("to", java.util.List.of(java.util.Map.of("email", destinataire)));
            body.put("subject", "Invitation : Configuration de votre espace SimpleTaff pour " + nomEntreprise);
            body.put("htmlContent", htmlContent);
            
            org.springframework.http.HttpEntity<java.util.Map<String, Object>> entity = new org.springframework.http.HttpEntity<>(body, headers);
            
            org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity(
                "https://api.brevo.com/v3/smtp/email", entity, String.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("[InvitationService] Email envoyé avec succès à " + destinataire + " via l'API REST");
            } else {
                System.err.println("[InvitationService] Erreur inattendue de l'API Brevo: " + response.getBody());
            }
            
        } catch (Exception e) {
            System.err.println("[InvitationService] Erreur lors de l'appel à l'API REST Brevo: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
