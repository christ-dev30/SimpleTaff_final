package com.siege.platform.materiel;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.util.UUID;

@Entity
@Table(name = "materiel")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Materiel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Column(nullable = false)
    private String categorie;

    @Column(nullable = false)
    private String libelle;

    private String numeroSerie;
    private String operateur;
    private String forfait;
    private String creditMensuel;

    private String description;

    @Column(name = "valeur_achat")
    private java.math.BigDecimal valeurAchat = java.math.BigDecimal.ZERO;

    private String marque;
    private String modele;
    private String imei;
    private java.time.LocalDate dateAcquisition;
    private java.time.LocalDate dateAffectation;
    private String garantie;
    private String numeroSim;
    private java.time.LocalDate dateActivation;
    private String sourceAjout = "ADMIN_ENTREPRISE";
    private java.time.LocalDate dateAjout = java.time.LocalDate.now();

    @Column(nullable = false)
    private String statut = "DISPONIBLE";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "zone_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "entreprise"})
    private com.siege.platform.zone.Zone zone;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "coordonnateur_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "motDePasseHash", "entreprise", "zone", "dateCreation", "statut", "role"})
    private com.siege.platform.utilisateur.Coordonnateur coordonnateur;
}
