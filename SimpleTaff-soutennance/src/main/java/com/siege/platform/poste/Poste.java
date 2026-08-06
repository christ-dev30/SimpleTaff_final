package com.siege.platform.poste;

import com.siege.platform.emploi.Emploi;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.structuredemandeuse.Site;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "poste")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class Poste {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "emploi_id", nullable = false)
    private Emploi emploi;

    private String categorieAppliquee;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal salaireBrutNegocie;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montantRetenueForfaitaire;

    @Column(nullable = false)
    private String statut;
}
