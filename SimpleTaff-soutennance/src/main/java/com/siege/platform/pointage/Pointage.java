package com.siege.platform.pointage;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.poste.Affectation;
import com.siege.platform.utilisateur.Employeur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;
import java.math.BigDecimal;

@Entity
@Table(name = "pointage")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Pointage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "affectation_id", nullable = false)
    private Affectation affectation;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "carte_scannee_id", nullable = false)
    private CarteAgent carteScannee;

    @Column(nullable = false)
    private LocalDateTime dateHeureEntree;

    private LocalDateTime dateHeureSortie;

    private String mode = "QR_CODE";

    @Column(precision = 10, scale = 7)
    private BigDecimal latitudeEntree;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitudeEntree;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitudeSortie;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitudeSortie;

    @Column(precision = 10, scale = 2)
    private BigDecimal distanceParcourueKm = BigDecimal.ZERO;

    private Integer dureeMinutes;

    @Column(columnDefinition = "TEXT")
    private String anomalie;

    @Column(length = 500)
    private String selfieUrl;

    private String identifiantNfc;

    private String sourceBiometrie;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "valide_par_employeur_id")
    private Employeur valideParEmployeur;

    private LocalDateTime dateValidation;

    @Column(nullable = false)
    private String statut;
}
