package com.siege.platform.structuredemandeuse;

import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.util.UUID;

@Entity
@Table(name = "structure_demandeuse")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class StructureDemandeuse {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Column(nullable = false)
    private String raisonSociale;

    private String secteur;

    @Column(nullable = false)
    private Boolean besoinsRecurrents = false;
}
