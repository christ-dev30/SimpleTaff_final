package com.siege.platform.conge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SoldeCongeRepository extends JpaRepository<SoldeConge, UUID> {
    Optional<SoldeConge> findByAgentIdAndAnnee(UUID agentId, Integer annee);
}
