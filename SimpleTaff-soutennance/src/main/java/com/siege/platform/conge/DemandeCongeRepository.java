package com.siege.platform.conge;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DemandeCongeRepository extends JpaRepository<DemandeConge, UUID> {
    List<DemandeConge> findByAgentIdOrderByDateDebutDesc(UUID agentId);
}
