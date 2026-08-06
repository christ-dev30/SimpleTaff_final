package com.siege.platform.utilisateur;

import com.siege.platform.common.enums.Role;
import com.siege.platform.common.enums.StatutUtilisateur;
import com.siege.platform.entreprise.Entreprise;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "utilisateur")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "role", discriminatorType = DiscriminatorType.STRING)
@Getter
@Setter
@Filter(name = "tenantFilter", condition = "entreprise_id = :entrepriseId")
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Column(nullable = false)
    private String prenom;

    @Column(nullable = true, unique = true)
    private String email;

    @Column(nullable = false)
    private String motDePasseHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, insertable = false, updatable = false)
    private Role role;

    public Role getRole() {
        Object target = this;
        if (target instanceof org.hibernate.proxy.HibernateProxy) {
            target = ((org.hibernate.proxy.HibernateProxy) target).getHibernateLazyInitializer().getImplementation();
        }
        if (target instanceof SuperAdmin) {
            return Role.SUPER_ADMIN;
        }
        if (target instanceof AdminEntreprise) {
            return Role.ADMIN_ENTREPRISE;
        }
        if (target instanceof Coordonnateur) {
            return Role.COORDONNATEUR;
        }
        if (target instanceof Employeur) {
            return Role.EMPLOYEUR;
        }
        return this.role;
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entreprise_id")
    private Entreprise entreprise;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutUtilisateur statut;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dateCreation;

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
    }
}
