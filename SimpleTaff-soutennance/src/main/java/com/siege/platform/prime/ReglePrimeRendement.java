package com.siege.platform.prime;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "regle_prime_rendement")
@Getter
@Setter
public class ReglePrimeRendement {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Entreprise entreprise;

    @Column(nullable = false)
    private String libelle;

    @Column(name = "montant_par_point", precision = 10, scale = 2, nullable = false)
    private BigDecimal montantParPoint;

    @Column(name = "seuil_minimum", nullable = false)
    private int seuilMinimum;

    @Column(nullable = false)
    private String statut = "ACTIF";
}
