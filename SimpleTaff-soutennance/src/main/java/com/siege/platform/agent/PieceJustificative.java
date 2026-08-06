package com.siege.platform.agent;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import org.hibernate.annotations.Filter;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "piece_justificative")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class PieceJustificative {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private com.siege.platform.entreprise.Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private AgentTerrain agent;

    @Column(nullable = false)
    private String type;

    private LocalDate dateEmission;

    private LocalDate dateExpiration;

    @Column(nullable = false)
    private String statut = "VALIDE";

    private LocalDate alerteEnvoyeeLe;

    @Column(nullable = false, length = 500)
    private String urlDocument;
}
