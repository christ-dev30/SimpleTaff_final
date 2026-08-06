package com.siege.platform.workflow;

import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.util.UUID;

@Entity
@Table(name = "workflow_definition")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class WorkflowDefinition {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Column(nullable = false)
    private String code;

    @Column(nullable = false)
    private String libelle;

    @Column(nullable = false)
    private Integer nombreEtapes = 2;

    @Column(nullable = false)
    private String statut = "ACTIF";
}
