package com.siege.platform.materiel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AffectationMaterielRepository extends JpaRepository<AffectationMateriel, UUID> {
    List<AffectationMateriel> findByAgentIdOrderByDateRemiseDesc(UUID agentId);
    Optional<AffectationMateriel> findFirstByMaterielIdAndStatut(UUID materielId, String statut);
    List<AffectationMateriel> findAllByOrderByDateRemiseDesc();
}
