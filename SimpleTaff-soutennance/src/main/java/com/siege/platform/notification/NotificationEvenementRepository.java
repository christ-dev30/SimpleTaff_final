package com.siege.platform.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

import java.util.List;

@Repository
public interface NotificationEvenementRepository extends JpaRepository<NotificationEvenement, UUID> {
    List<NotificationEvenement> findByStatut(String statut);
    List<NotificationEvenement> findAllByOrderByCreeLeDesc();
    List<NotificationEvenement> findByEntrepriseIdAndTypeAndMessageContaining(UUID entrepriseId, String type, String messagePart);
    List<NotificationEvenement> findByTypeAndMessageContaining(String type, String messagePart);
}
