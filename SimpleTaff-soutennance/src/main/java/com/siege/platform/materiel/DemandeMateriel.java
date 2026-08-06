package com.siege.platform.materiel;
 
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;
import java.util.UUID;
 
@Entity
@Table(name = "demande_materiel")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DemandeMateriel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
 
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;
 
    @Column(nullable = false)
    private String libelle;
 
    @Column(nullable = false)
    private String categorie;
 
    private String motif;
    private String coordonnateurNom;
    private String numeroSerie;

    @Column(name = "valeur_achat")
    private java.math.BigDecimal valeurAchat = java.math.BigDecimal.ZERO;
 
    @Column(nullable = false)
    private LocalDateTime dateDemande = LocalDateTime.now();
 
    @Column(nullable = false)
    private String statut = "EN_ATTENTE"; // EN_ATTENTE, APPROUVEE, REJETEE
}
