package com.siege.platform.facturation;

import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.poste.Affectation;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "facture")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class Facture {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_demandeuse_id", nullable = false)
    private StructureDemandeuse structureDemandeuse;

    @Column(nullable = false)
    private String periode;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal montantFacture;

    @Column(name = "numero_facture", length = 50)
    private String numeroFacture;

    @Column(name = "montant_ht", nullable = false, precision = 10, scale = 2)
    private BigDecimal montantHt = BigDecimal.ZERO;

    @Column(name = "montant_tva", nullable = false, precision = 10, scale = 2)
    private BigDecimal montantTva = BigDecimal.ZERO;

    @Column(name = "montant_ttc", nullable = false, precision = 10, scale = 2)
    private BigDecimal montantTtc = BigDecimal.ZERO;

    @Column(nullable = false)
    private String rapportPointageUrl;

    @Column(nullable = false)
    private String statutPaiement;

    @Column(nullable = false)
    private java.time.LocalDate dateEmission;

    @Column(nullable = false)
    private String modePaiement = "VIREMENT_BANCAIRE";

    @ManyToMany
    @JoinTable(
            name = "facture_affectation",
            joinColumns = @JoinColumn(name = "facture_id"),
            inverseJoinColumns = @JoinColumn(name = "affectation_id")
    )
    private Set<Affectation> affectations = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        dateEmission = java.time.LocalDate.now();
    }
}
