package com.siege.platform.paie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParametrePaieRepository extends JpaRepository<ParametrePaie, UUID> {
    Optional<ParametrePaie> findByEntrepriseId(UUID entrepriseId);
}
