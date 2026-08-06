package com.siege.platform.paie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BulletinDePaieRepository extends JpaRepository<BulletinDePaie, UUID> {
    boolean existsByAffectationIdAndPeriode(UUID affectationId, String periode);
}
