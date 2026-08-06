package com.siege.platform.disciplinaire;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SanctionRepository extends JpaRepository<Sanction, UUID> {
    List<Sanction> findByAgentIdOrderByDateDecisionDesc(UUID agentId);
    boolean existsByAgentIdAndStatut(UUID agentId, String statut);
}
