package com.siege.platform.entreprise;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface EntrepriseRepository extends JpaRepository<Entreprise, UUID> {
}
