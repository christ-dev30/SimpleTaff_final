package com.siege.platform.mission;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.poste.Affectation;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "mission")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Mission {
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

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "entreprise", "agent"})
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "affectation_id")
    private Affectation affectation;

    @Column(nullable = false)
    private String titre;

    @Column(precision = 10, scale = 7)
    private BigDecimal localisationLat;

    @Column(precision = 10, scale = 7)
    private BigDecimal localisationLng;

    @Column(columnDefinition = "TEXT")
    private String objectifs;

    private java.time.LocalDate planningDebut;

    private java.time.LocalDate planningFin;

    @Column(nullable = false)
    private String statut = "PREVUE";

    private LocalDateTime demarreeLe;
}
