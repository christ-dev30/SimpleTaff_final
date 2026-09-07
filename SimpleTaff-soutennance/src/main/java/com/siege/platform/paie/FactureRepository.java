package com.siege.platform.paie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FactureRepository extends JpaRepository<Facture, UUID> {
    List<Facture> findByEntrepriseIdOrderByDateEmissionDesc(UUID entrepriseId);
}
