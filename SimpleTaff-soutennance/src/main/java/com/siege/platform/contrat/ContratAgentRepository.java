package com.siege.platform.contrat;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ContratAgentRepository extends JpaRepository<ContratAgent, UUID> {
    List<ContratAgent> findByAgentIdOrderByDateDebutDesc(UUID agentId);
    List<ContratAgent> findByDateFinBetweenAndStatut(LocalDate debut, LocalDate fin, String statut);
    List<ContratAgent> findByDateFinAndStatut(LocalDate dateFin, String statut);
}
