package com.siege.platform.evaluation;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "evaluation_coordonnateur")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EvaluationCoordonnateur {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "entreprise", "affectations", "pointages", "evaluations", "conges"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @Column(nullable = false)
    private Integer annee;

    private LocalDate dateEvaluation = LocalDate.now();

    // Critères propres au Coordonnateur — gestion de l'agent à l'échelle de la zone
    private Integer reactiviteAffectations = 0;
    private Integer mobiliteInterSites = 0;
    private Integer conformiteAdministrative = 0;
    private Integer relationnelEquipe = 0;
    private Integer autonomieTerrain = 0;
    private Integer historiqueDisciplinaire = 0;

    private Integer scoreTotal = 0;
    private String coordonnateurEvaluateur;

    @Column(columnDefinition = "TEXT")
    private String commentaire;
}
