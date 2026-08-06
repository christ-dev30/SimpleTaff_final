package com.siege.platform.contrat;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "contrat_agent")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ContratAgent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_cliente_id")
    private StructureDemandeuse structureCliente;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private LocalDate dateDebut;

    private LocalDate dateFin;

    private String direction;

    private java.math.BigDecimal salaireBase;
    private String fonction;
    private String departement;

    @Column(nullable = false)
    private String statut = "ACTIF";

    @Column(length = 500)
    private String documentUrl;
}
