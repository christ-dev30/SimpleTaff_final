package com.siege.platform.emploi;

import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "emploi")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class Emploi {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @Column(nullable = false)
    private String libelle;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String categorie;

    @Column(columnDefinition = "TEXT")
    private String competencesRequises;

    @Column(precision = 10, scale = 2)
    private BigDecimal salaireBrutReference;
}
