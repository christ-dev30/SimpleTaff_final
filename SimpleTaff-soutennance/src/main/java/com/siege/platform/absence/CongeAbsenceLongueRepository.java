package com.siege.platform.absence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CongeAbsenceLongueRepository extends JpaRepository<CongeAbsenceLongue, UUID> {
}
