package com.siege.platform.poste;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.siege.platform.agent.AgentTerrain;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.utilisateur.Utilisateur;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "affectation")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Affectation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id", nullable = false)
    private Entreprise entreprise;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "poste_id", nullable = false)
    private Poste poste;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private AgentTerrain agent;

    @Column(nullable = false)
    private LocalDate dateDebutOccupation;

    private LocalDate dateFinOccupation;

    private String commune;

    private String zoneOperationnelle;

    private String motifAffectation;

    @Column(length = 500)
    private String decisionUrl;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsable_validant_id")
    private Utilisateur responsableValidant;

    private String motifFin;

    private String region;
    private String ville;
    private String superviseur;
    private String client;
    private String mission;
    private String projet;
    private String heureArriveeSite;
    private String heureDepartSite;
    private String siteTravail;
    private String employeurResponsable;
    private String heureDebut;
    private String heureFin;

    @Column(nullable = false)
    private String statut;
}
