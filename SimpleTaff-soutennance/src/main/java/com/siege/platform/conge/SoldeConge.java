package com.siege.platform.conge;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.util.UUID;

@Entity
@Table(name = "solde_conge")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SoldeConge {
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

    @Column(nullable = false)
    private Integer soldeTotal = 0;

    @Column(nullable = false)
    private Integer joursConsommes = 0;

    @Column(nullable = false)
    private Integer joursRestants = 0;
}
