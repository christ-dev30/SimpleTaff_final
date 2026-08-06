package com.siege.platform.dotation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DemandeDotationRepository extends JpaRepository<DemandeDotation, UUID> {
}
