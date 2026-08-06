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
@Table(name = "evaluation_agent")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EvaluationAgent {
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

    private Integer ponctualite = 0;
    private Integer discipline = 0;
    private Integer qualite = 0;
    private Integer productivite = 0;
    private Integer espritEquipe = 0;
    private Integer respectProcedures = 0;
    private Integer satisfactionClient = 0;
    private Integer communication = 0;
    private Integer scoreTotal = 0;
    private String employeurEvaluateur;

    @Column(columnDefinition = "TEXT")
    private String commentaire;
}
