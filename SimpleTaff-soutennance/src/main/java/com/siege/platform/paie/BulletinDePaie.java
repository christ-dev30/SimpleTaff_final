package com.siege.platform.paie;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bulletin_de_paie")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulletinDePaie {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @Column(nullable = false)
    private String periode; // Format: YYYY-MM

    private int joursPrevus;
    private int joursValides;
    private int joursAbsenceNonJustifiee;

    @Column(precision = 12, scale = 2)
    private BigDecimal salaireDeBase;

    @Column(precision = 12, scale = 2)
    private BigDecimal salaireBrutEffectif;

    @Column(precision = 12, scale = 2)
    private BigDecimal salaireNetCalcule;

    @Column(precision = 12, scale = 2)
    private BigDecimal cotisationCnps;

    @Column(precision = 12, scale = 2)
    private BigDecimal cotisationCnam;

    @Column(precision = 12, scale = 2)
    private BigDecimal impotSurRevenu;

    @Column(precision = 12, scale = 2)
    private BigDecimal primeTransport;

    @Column(precision = 12, scale = 2)
    private BigDecimal primeLogement;

    @Column(precision = 12, scale = 2)
    private BigDecimal primeRendement;

    @Column(precision = 12, scale = 2)
    private BigDecimal totalPrimes;

    @Column(precision = 12, scale = 2)
    private BigDecimal retenueAbsence;

    private LocalDateTime creeLe;
    private LocalDateTime dateCloture;
    
    
    @PrePersist
    protected void onCreate() {
        creeLe = LocalDateTime.now();
        if (dateCloture == null) {
            dateCloture = LocalDateTime.now();
        }
    }
}
