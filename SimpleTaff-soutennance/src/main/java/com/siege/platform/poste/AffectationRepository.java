package com.siege.platform.poste;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AffectationRepository extends JpaRepository<Affectation, UUID> {
    
    @EntityGraph(attributePaths = {"agent", "poste", "poste.site"})
    Optional<Affectation> findByAgentIdAndStatut(UUID agentId, String statut);
    
    @EntityGraph(attributePaths = {"agent", "poste", "poste.site"})
    List<Affectation> findAllByAgentIdAndStatut(UUID agentId, String statut);
    
    @EntityGraph(attributePaths = {"agent", "poste", "poste.site"})
    List<Affectation> findAllByStatut(String statut);
    
    boolean existsByAgentIdAndStatut(UUID agentId, String statut);
}
