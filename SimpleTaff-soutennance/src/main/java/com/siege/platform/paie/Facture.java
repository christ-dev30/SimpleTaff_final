package com.siege.platform.paie;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "facture")
@Getter
@Setter
public class Facture {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "structure_demandeuse_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private StructureDemandeuse structureDemandeuse;

    @Column(nullable = false)
    private String periode;

    @Column(name = "numero_facture")
    private String numeroFacture;

    @Column(name = "montant_facture", precision = 10, scale = 2, nullable = false)
    private BigDecimal montantFacture;

    @Column(name = "montant_ht", precision = 10, scale = 2, nullable = false)
    private BigDecimal montantHt = BigDecimal.ZERO;

    @Column(name = "montant_tva", precision = 10, scale = 2, nullable = false)
    private BigDecimal montantTva = BigDecimal.ZERO;

    @Column(name = "montant_ttc", precision = 10, scale = 2, nullable = false)
    private BigDecimal montantTtc = BigDecimal.ZERO;

    @Column(name = "rapport_pointage_url", nullable = false)
    private String rapportPointageUrl;

    @Column(name = "statut_paiement", nullable = false)
    private String statutPaiement = "EN_ATTENTE";

    @Column(name = "mode_paiement", nullable = false)
    private String modePaiement = "VIREMENT_BANCAIRE";

    @Column(name = "date_emission", nullable = false)
    private LocalDateTime dateEmission;

    @PrePersist
    protected void onCreate() {
        if (dateEmission == null) {
            dateEmission = LocalDateTime.now();
        }
    }
}
