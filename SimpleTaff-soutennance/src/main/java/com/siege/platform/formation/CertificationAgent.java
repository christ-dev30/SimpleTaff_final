package com.siege.platform.formation;

import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "certification_agent")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class CertificationAgent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @Column(nullable = false)
    private String libelle;

    private LocalDate dateObtention;
    private LocalDate dateExpiration;

    @Column(length = 500)
    private String documentUrl;

    @Column(nullable = false)
    private String statut = "VALIDE";
}
