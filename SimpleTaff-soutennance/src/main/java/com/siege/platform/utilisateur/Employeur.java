package com.siege.platform.utilisateur;

import com.siege.platform.structuredemandeuse.Site;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@DiscriminatorValue("EMPLOYEUR")
@Getter
@Setter
public class Employeur extends Utilisateur {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_demandeuse_id")
    private StructureDemandeuse structureDemandeuse;

    @ManyToMany
    @JoinTable(
            name = "employeur_site",
            joinColumns = @JoinColumn(name = "employeur_id"),
            inverseJoinColumns = @JoinColumn(name = "site_id")
    )
    private Set<Site> sites = new HashSet<>();
}
