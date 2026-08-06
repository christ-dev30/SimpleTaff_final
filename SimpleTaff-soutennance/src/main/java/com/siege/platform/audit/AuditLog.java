package com.siege.platform.audit;

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
@Table(name = "audit_log")
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @Column(name = "utilisateur")
    private String utilisateurEmail;

    private String action;
    private String module;
    private String cibleId;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false)
    private LocalDateTime creeLe = LocalDateTime.now();
}
