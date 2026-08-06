package com.siege.platform.pointage;

import com.siege.platform.poste.Affectation;
import com.siege.platform.poste.AffectationRepository;
import com.siege.platform.utilisateur.Employeur;
import com.siege.platform.utilisateur.UtilisateurRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class PointageService {

    private final PointageRepository pointageRepository;
    private final CarteAgentRepository carteAgentRepository;
    private final AffectationRepository affectationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final com.siege.platform.common.QRCodeUtil qrCodeUtil;

    public PointageService(PointageRepository pointageRepository,
                           CarteAgentRepository carteAgentRepository,
                           AffectationRepository affectationRepository,
                           UtilisateurRepository utilisateurRepository,
                           com.siege.platform.common.QRCodeUtil qrCodeUtil) {
        this.pointageRepository = pointageRepository;
        this.carteAgentRepository = carteAgentRepository;
        this.affectationRepository = affectationRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.qrCodeUtil = qrCodeUtil;
    }

    @Transactional
    public Pointage scannerCarte(String codeQr) {
        return scannerCarte(codeQr, null, "QR_CODE");
    }

    @Transactional
    public Pointage scannerCarte(String codeQr, String typePointage) {
        return scannerCarte(codeQr, typePointage, "QR_CODE");
    }

    @Transactional
    public Pointage scannerCarte(String identifiant, String typePointage, String mode) {
        Optional<CarteAgent> carteOpt;
        String resolvedMode = mode != null ? mode.toUpperCase() : "QR_CODE";

        if ("NFC".equals(resolvedMode)) {
            carteOpt = carteAgentRepository.findByIdentifiantNfcAndStatut(identifiant, "ACTIVE");
        } else if ("BIOMETRIE".equals(resolvedMode)) {
            carteOpt = carteAgentRepository.findBySourceBiometrieAndStatut(identifiant, "ACTIVE");
        } else {
            // QR Code (cryptographic or fallback to direct matching)
            UUID agentId = null;
            try {
                agentId = qrCodeUtil.extractAgentId(identifiant);
            } catch (Exception e) {
                // Not a valid JWT or expired, fallback to direct matching
            }

            if (agentId != null) {
                carteOpt = carteAgentRepository.findByAgentIdAndStatut(agentId, "ACTIVE");
            } else {
                carteOpt = carteAgentRepository.findByCodeQrAndStatut(identifiant, "ACTIVE");
            }
        }

        CarteAgent carte = carteOpt.orElseThrow(() -> new IllegalArgumentException("Carte active introuvable."));

        Affectation affectationActive = affectationRepository.findByAgentIdAndStatut(carte.getAgent().getId(), "ACTIVE")
                .orElseThrow(() -> new IllegalStateException("L'agent n'a aucune affectation active."));

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();
        Optional<Pointage> pointageDuJour = pointageRepository
                .findFirstByAffectationIdAndDateHeureEntreeBetweenOrderByDateHeureEntreeDesc(
                        affectationActive.getId(),
                        startOfDay,
                        endOfDay
                );
        String type = typePointage != null ? typePointage.trim().toUpperCase() : null;

        if (type != null && !type.equals("ENTREE") && !type.equals("SORTIE")) {
            throw new IllegalArgumentException("Type de pointage invalide.");
        }

        Pointage saved;
        if (pointageDuJour.isPresent()) {
            Pointage p = pointageDuJour.get();

            if ("ENTREE".equals(type)) {
                throw new IllegalStateException("L'entree a deja ete scannee aujourd'hui pour cet agent.");
            }

            if (p.getDateHeureSortie() != null) {
                throw new IllegalStateException("L'entree et la sortie ont deja ete scannees aujourd'hui pour cet agent.");
            }

            p.setDateHeureSortie(LocalDateTime.now());
            p.setMode(resolvedMode);
            saved = pointageRepository.save(p);
        } else {
            if ("SORTIE".equals(type)) {
                throw new IllegalStateException("Aucun pointage d'entree aujourd'hui pour cet agent.");
            }

            Pointage nouveauPointage = new Pointage();
            nouveauPointage.setEntreprise(affectationActive.getEntreprise());
            nouveauPointage.setAffectation(affectationActive);
            nouveauPointage.setCarteScannee(carte);
            nouveauPointage.setDateHeureEntree(LocalDateTime.now());
            nouveauPointage.setStatut("EN_ATTENTE");
            nouveauPointage.setMode(resolvedMode);
            saved = pointageRepository.save(nouveauPointage);
        }
        return saved;
    }

    @Transactional
    public Pointage validerPointage(UUID pointageId, UUID employeurId) {
        Pointage pointage = pointageRepository.findById(pointageId)
                .orElseThrow(() -> new IllegalArgumentException("Pointage introuvable."));

        if (pointage.getDateHeureSortie() == null) {
            throw new IllegalStateException("Impossible de valider un pointage dont la sortie n'a pas ete scannee.");
        }

        Employeur employeur = (Employeur) utilisateurRepository.findById(employeurId)
                .orElseThrow(() -> new IllegalArgumentException("Employeur introuvable."));

        pointage.setValideParEmployeur(employeur);
        pointage.setDateValidation(LocalDateTime.now());
        pointage.setStatut("VALIDE");

        return pointageRepository.save(pointage);
    }
}
