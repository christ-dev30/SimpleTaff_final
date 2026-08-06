package com.siege.platform.invitation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface InvitationEntrepriseRepository extends JpaRepository<InvitationEntreprise, UUID> {
    Optional<InvitationEntreprise> findByToken(String token);
}
