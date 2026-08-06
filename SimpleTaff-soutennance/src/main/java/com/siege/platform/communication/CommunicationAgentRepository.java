package com.siege.platform.communication;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommunicationAgentRepository extends JpaRepository<CommunicationAgent, UUID> {
}
