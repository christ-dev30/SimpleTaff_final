package com.siege.platform.structuredemandeuse;

import com.siege.platform.zone.Zone;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "site")
@Getter
@Setter
public class Site {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private com.siege.platform.entreprise.Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_demandeuse_id", nullable = false)
    private StructureDemandeuse structureDemandeuse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @Column(nullable = false)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String adresse;
}
