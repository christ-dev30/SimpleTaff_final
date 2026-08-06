package com.siege.platform.disciplinaire;

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
@Table(name = "sanction")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Sanction {
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
    private String type;

    @Column(columnDefinition = "TEXT")
    private String motif;

    @Column(length = 500)
    private String decisionUrl;

    @Column(nullable = false)
    private LocalDate dateDecision = LocalDate.now();

    private LocalDate dateFin;
    private String clientFinal;
    private String coordonnateurRemonte;

    @Column(nullable = false)
    private String statut = "EN_COURS";
}
