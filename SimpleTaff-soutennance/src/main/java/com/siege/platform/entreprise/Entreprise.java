package com.siege.platform.entreprise;

import com.siege.platform.common.enums.FormuleAbonnement;
import com.siege.platform.common.enums.StatutEntreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "entreprise")
@Getter
@Setter
public class Entreprise {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutEntreprise statut;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FormuleAbonnement formuleAbonnement;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal tauxCotisation;

    @Column(nullable = false)
    private Integer seuilAbsenceLongueJours = 21;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal tauxRetenueReduite = new BigDecimal("25.00");

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
    }
}
