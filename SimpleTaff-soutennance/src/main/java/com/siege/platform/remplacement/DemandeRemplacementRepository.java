package com.siege.platform.remplacement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DemandeRemplacementRepository extends JpaRepository<DemandeRemplacement, UUID> {
    List<DemandeRemplacement> findByDemandeurId(UUID demandeurId);
    List<DemandeRemplacement> findByStatut(String statut);
    List<DemandeRemplacement> findAllByOrderByDateDemandeDesc();
}
