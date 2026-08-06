package com.siege.platform.prime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReglePrimeRendementRepository extends JpaRepository<ReglePrimeRendement, UUID> {
}
