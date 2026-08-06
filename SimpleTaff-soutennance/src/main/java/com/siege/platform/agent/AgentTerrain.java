package com.siege.platform.agent;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.emploi.Emploi;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.zone.Zone;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "agent_terrain")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AgentTerrain {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column(nullable = false)
    private String contact;

    private String telephoneSecondaire;

    private String situationMatrimoniale;

    private Integer nombreEnfants = 0;

    private String contactUrgenceNom;

    private String contactUrgenceTelephone;

    private String contactUrgenceLien;

    private String matricule;
    private String photoUrl;
    private String genre;
    private java.time.LocalDate dateNaissance;
    private String lieuNaissance;
    private String nationalite;
    private String adresse;
    private String commune;
    private String ville;
    private String email;

    @Column(nullable = false)
    private String statut;

    @ManyToMany
    @JoinTable(
            name = "agent_emploi",
            joinColumns = @JoinColumn(name = "agent_id"),
            inverseJoinColumns = @JoinColumn(name = "emploi_id")
    )
    private Set<Emploi> emplois = new HashSet<>();
}
