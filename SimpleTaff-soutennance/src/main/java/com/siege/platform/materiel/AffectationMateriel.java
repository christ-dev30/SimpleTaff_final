package com.siege.platform.materiel;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.agent.AgentTerrain;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "affectation_materiel")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AffectationMateriel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "materiel_id", nullable = false)
    private Materiel materiel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @Column(nullable = false)
    private LocalDateTime dateRemise = LocalDateTime.now();

    private LocalDateTime dateRetour;

    @Column(length = 500)
    private String signatureRemiseUrl;

    @Column(length = 500)
    private String signatureRetourUrl;

    @Column(nullable = false)
    private String statut = "REMIS";
}
