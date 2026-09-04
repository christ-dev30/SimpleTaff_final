package com.siege.platform.evaluation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EvaluationCoordonnateurRepository extends JpaRepository<EvaluationCoordonnateur, UUID> {

    @Query("SELECT e FROM EvaluationCoordonnateur e JOIN FETCH e.agent a WHERE e.entreprise.id = :entrepriseId ORDER BY e.dateEvaluation DESC")
    List<EvaluationCoordonnateur> findByEntrepriseIdWithAgent(@Param("entrepriseId") UUID entrepriseId);

    @Query("SELECT e FROM EvaluationCoordonnateur e JOIN FETCH e.agent a WHERE a.id = :agentId ORDER BY e.annee DESC")
    List<EvaluationCoordonnateur> findByAgentIdOrderByAnneeDesc(@Param("agentId") UUID agentId);
}
