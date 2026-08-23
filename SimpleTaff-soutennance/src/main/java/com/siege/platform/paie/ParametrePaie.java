package com.siege.platform.paie;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "parametre_paie")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParametrePaie {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false, unique = true)
    private Entreprise entreprise;

    @Column(precision = 5, scale = 4)
    private BigDecimal tauxCnps = new BigDecimal("0.0630");

    @Column(precision = 5, scale = 4)
    private BigDecimal tauxCnam = new BigDecimal("0.0100");

    @Column(precision = 5, scale = 4)
    private BigDecimal tauxImpot = new BigDecimal("0.0200");

    @Column(precision = 12, scale = 2)
    private BigDecimal primeTransport = new BigDecimal("15000.00");

    @Column(precision = 12, scale = 2)
    private BigDecimal primeLogement = new BigDecimal("10000.00");

    @Column(precision = 12, scale = 2)
    private BigDecimal primeRendement = new BigDecimal("5000.00");
}
