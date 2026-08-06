package com.siege.platform.mission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MissionRepository extends JpaRepository<Mission, UUID> {
    List<Mission> findByAgentIdOrderByPlanningDebutDesc(UUID agentId);
}
