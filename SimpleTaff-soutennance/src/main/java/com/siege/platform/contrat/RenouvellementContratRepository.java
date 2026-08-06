package com.siege.platform.contrat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RenouvellementContratRepository extends JpaRepository<RenouvellementContrat, UUID> {
    List<RenouvellementContrat> findByContratIdOrderByCreeLeDesc(UUID contratId);
}
