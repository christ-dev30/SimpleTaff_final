package com.siege.platform.materiel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MaterielRepository extends JpaRepository<Materiel, UUID> {
    List<Materiel> findByCategorieOrderByLibelle(String categorie);
    long countByStatut(String statut);
}
