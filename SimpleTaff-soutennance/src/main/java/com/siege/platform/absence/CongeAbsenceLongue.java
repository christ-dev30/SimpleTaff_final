package com.siege.platform.absence;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.poste.Affectation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "conge_absence_longue")
@Getter
@Setter
public class CongeAbsenceLongue {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @Column(nullable = false)
    private String type; // CONGE_PAYE_ANNUEL, MALADIE_LONGUE_DUREE, DEUIL, AUTRE

    @Column(nullable = false)
    private LocalDate dateDebut;

    @Column(nullable = false)
    private LocalDate dateFin;

    private String justificatifUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "affectation_remplacement_id")
    private Affectation affectationRemplacement;
}
