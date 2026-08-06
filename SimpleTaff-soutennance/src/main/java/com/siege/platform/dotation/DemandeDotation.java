package com.siege.platform.dotation;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.utilisateur.Coordonnateur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "demande_dotation")
@Getter
@Setter
public class DemandeDotation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "demandeur_coordonnateur_id", nullable = false)
    private Coordonnateur demandeurCoordonnateur;

    @Column(nullable = false)
    private String type; // EQUIPEMENT, CARTE_QR

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String statut; // DEMANDE, VALIDEE, ENVOYEE, REMISE

    private LocalDateTime dateRemise;
}
