package com.siege.platform.paie;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BulletinDePaieRepository extends JpaRepository<BulletinDePaie, UUID> {
    
    List<BulletinDePaie> findByEntrepriseIdAndPeriode(UUID entrepriseId, String periode);
    
    Optional<BulletinDePaie> findByAgentIdAndPeriode(UUID agentId, String periode);
    
    List<BulletinDePaie> findByAgentIdOrderByPeriodeDesc(UUID agentId);
}
