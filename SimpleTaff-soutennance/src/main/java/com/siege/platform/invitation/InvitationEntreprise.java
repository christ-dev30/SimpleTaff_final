package com.siege.platform.invitation;

import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.common.enums.FormuleAbonnement;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "invitation_entreprise")
@Getter
@Setter
public class InvitationEntreprise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "email_destinataire", nullable = false)
    private String emailDestinataire;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Enumerated(EnumType.STRING)
    @Column(name = "formule_abonnement", nullable = false)
    private FormuleAbonnement formuleAbonnement;

    @Column(nullable = false)
    private boolean utilise = false;

    @Column(name = "date_creation", nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_expiration", nullable = false)
    private LocalDateTime dateExpiration;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        dateExpiration = LocalDateTime.now().plusMinutes(30);
    }
}
