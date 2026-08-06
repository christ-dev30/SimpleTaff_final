package com.siege.platform.facturation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FactureRepository extends JpaRepository<Facture, UUID> {
    long countByPeriode(String periode);
}
