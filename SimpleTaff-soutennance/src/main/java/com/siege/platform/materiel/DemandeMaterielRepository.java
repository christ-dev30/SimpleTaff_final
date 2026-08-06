package com.siege.platform.materiel;
 
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;
import java.util.List;
 
@Repository
public interface DemandeMaterielRepository extends JpaRepository<DemandeMateriel, UUID> {
    List<DemandeMateriel> findByOrderByDateDemandeDesc();
}
