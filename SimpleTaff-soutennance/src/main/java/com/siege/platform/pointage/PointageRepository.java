package com.siege.platform.pointage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PointageRepository extends JpaRepository<Pointage, UUID> {
    @EntityGraph(attributePaths = {"affectation", "affectation.agent"})
    Optional<Pointage> findByAffectationIdAndDateHeureSortieIsNull(UUID affectationId);

    @EntityGraph(attributePaths = {"affectation", "affectation.agent"})
    Optional<Pointage> findFirstByAffectationIdAndDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(
            UUID affectationId,
            LocalDateTime start,
            LocalDateTime end
    );

    @EntityGraph(attributePaths = {"affectation", "affectation.agent", "affectation.poste", "affectation.poste.site"})
    List<Pointage> findByDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = {"affectation", "affectation.agent", "affectation.poste", "affectation.poste.site"})
    List<Pointage> findByAffectationAgentIdOrderByDateHeureEntreeDesc(UUID agentId);

    @EntityGraph(attributePaths = {"affectation", "affectation.agent", "affectation.poste", "affectation.poste.site"})
    List<Pointage> findByAffectationAgentIdAndDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(UUID agentId, LocalDateTime start, LocalDateTime end);

    long countByDateHeureEntreeBetween(LocalDateTime start, LocalDateTime end);

    @Query(value = """
            SELECT CAST(date_heure_entree AS date) AS jour, COUNT(*) AS total
            FROM pointage
            GROUP BY CAST(date_heure_entree AS date)
            ORDER BY jour DESC
            """, nativeQuery = true)
    List<Object[]> findPointageDatesWithCounts();

    @Query(value = """
            SELECT CAST(p.date_heure_entree AS date) AS jour, COUNT(*) AS total
            FROM pointage p
            JOIN affectation a ON p.affectation_id = a.id
            JOIN poste po ON a.poste_id = po.id
            WHERE po.site_id IN :siteIds
            GROUP BY CAST(p.date_heure_entree AS date)
            ORDER BY jour DESC
            """, nativeQuery = true)
    List<Object[]> findPointageDatesWithCountsForSites(@Param("siteIds") List<UUID> siteIds);
}
