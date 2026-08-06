package com.siege.platform.agent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AgentTerrainRepository extends JpaRepository<AgentTerrain, UUID> {
    List<AgentTerrain> findByEntrepriseId(UUID entrepriseId);
}
