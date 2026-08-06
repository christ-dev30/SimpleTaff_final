package com.siege.platform.poste;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PosteRepository extends JpaRepository<Poste, UUID> {
}
