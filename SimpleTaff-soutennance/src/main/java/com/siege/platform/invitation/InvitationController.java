package com.siege.platform.invitation;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/invitations")
public class InvitationController {

    private final InvitationService invitationService;

    public InvitationController(InvitationService invitationService) {
        this.invitationService = invitationService;
    }

    /**
     * POST /api/invitations/envoyer
     * Appelé par le Super Admin pour créer une entreprise et envoyer le lien d'invitation.
     */
    @PostMapping("/envoyer")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> envoyerInvitation(@RequestBody Map<String, Object> payload) {
        String nomEntreprise = (String) payload.getOrDefault("nomEntreprise", "");
        String formule = (String) payload.getOrDefault("formuleAbonnement", "PRO");
        double taux = Double.parseDouble(payload.getOrDefault("tauxCotisation", "5.5").toString());
        String email = (String) payload.getOrDefault("emailDestinataire", "");

        if (nomEntreprise.isBlank() || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nom d'entreprise et email requis."));
        }

        try {
            InvitationEntreprise inv = invitationService.creerEtEnvoyerInvitation(nomEntreprise, formule, taux, email);
            return ResponseEntity.ok(Map.of(
                "message", "Invitation envoyée avec succès à " + email,
                "token", inv.getToken(),
                "expiration", inv.getDateExpiration().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Erreur : " + e.getMessage()));
        }
    }

    /**
     * GET /api/invitations/verifier?token=xxx
     * Appelé par la page d'inscription pour valider le token avant d'afficher le formulaire.
     */
    @GetMapping("/verifier")
    public ResponseEntity<?> verifierToken(@RequestParam("token") String token) {
        try {
            InvitationEntreprise inv = invitationService.validerToken(token);
            return ResponseEntity.ok(Map.of(
                "valid", true,
                "entreprise", inv.getEntreprise().getNom(),
                "formule", inv.getFormuleAbonnement().name(),
                "email", inv.getEmailDestinataire(),
                "expiration", inv.getDateExpiration().toString()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("valid", false, "message", e.getMessage()));
        }
    }

    /**
     * POST /api/invitations/inscrire
     * Appelé par la page d'inscription pour créer l'admin et activer l'abonnement.
     */
    @PostMapping("/inscrire")
    public ResponseEntity<?> inscrire(@RequestBody Map<String, Object> payload) {
        String token = (String) payload.getOrDefault("token", "");
        String nom = (String) payload.getOrDefault("nom", "");
        String prenom = (String) payload.getOrDefault("prenom", "");
        String password = (String) payload.getOrDefault("password", "");

        if (token.isBlank() || nom.isBlank() || prenom.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tous les champs sont requis."));
        }
        if (password.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));
        }

        try {
            invitationService.inscrireAdminEntreprise(token, nom, prenom, password);
            return ResponseEntity.ok(Map.of("message", "Compte créé avec succès ! Vous pouvez maintenant vous connecter."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
