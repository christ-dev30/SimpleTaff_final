package com.siege.platform.utilisateur;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {

    /**
     * Charge l'utilisateur par email avec JOIN FETCH sur l'entreprise,
     * pour éviter le LazyInitializationException hors session Hibernate.
     */
    @Query("SELECT u FROM Utilisateur u LEFT JOIN FETCH u.entreprise WHERE u.email = :email")
    Optional<Utilisateur> findByEmail(@Param("email") String email);

    @Query("SELECT u FROM Coordonnateur u WHERE u.entreprise.id = :entrepriseId")
    List<Coordonnateur> findCoordsByEntrepriseId(@Param("entrepriseId") UUID entrepriseId);

    @Query("SELECT u FROM Employeur u WHERE u.entreprise.id = :entrepriseId")
    List<Employeur> findEmployeursByEntrepriseId(@Param("entrepriseId") UUID entrepriseId);
}
