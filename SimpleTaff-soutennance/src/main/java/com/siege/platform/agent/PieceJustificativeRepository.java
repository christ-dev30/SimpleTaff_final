package com.siege.platform.agent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface PieceJustificativeRepository extends JpaRepository<PieceJustificative, UUID> {
    List<PieceJustificative> findByAgentId(UUID agentId);
    List<PieceJustificative> findByDateExpirationBetween(LocalDate debut, LocalDate fin);
}
