package com.siege.platform.communication;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.utilisateur.Coordonnateur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "communication_agent")
@Getter
@Setter
public class CommunicationAgent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emetteur_coordonnateur_id")
    private Coordonnateur emetteurCoordonnateur;

    @Column(nullable = false)
    private String canal; // WHATSAPP, ORAL

    @Column(nullable = false)
    private String typeMessage; // AFFECTATION, CHANGEMENT_PLANNING, RAPPEL, AUTRE

    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    @Column(nullable = false)
    private LocalDateTime dateEnvoi;

    @Column(nullable = false)
    private String statutAccuseReception; // ENVOYE, LU, CONFIRME, SANS_REPONSE
}
