package com.siege.platform.zone;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ZoneRepository extends JpaRepository<Zone, UUID> {
    List<Zone> findByEntrepriseId(UUID entrepriseId);
}
