package com.siege.platform.emploi;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EmploiRepository extends JpaRepository<Emploi, UUID> {
    List<Emploi> findByEntrepriseId(UUID entrepriseId);
}
