package com.siege.platform.prime;

import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "regle_prime_rendement")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class ReglePrimeRendement {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Column(nullable = false)
    private String libelle;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montantParPoint = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer seuilMinimum = 0;

    @Column(nullable = false)
    private String statut = "ACTIF";
}
