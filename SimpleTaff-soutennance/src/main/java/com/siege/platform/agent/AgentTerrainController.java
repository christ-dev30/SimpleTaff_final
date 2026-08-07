package com.siege.platform.agent;

import com.siege.platform.pointage.CarteAgent;
import com.siege.platform.pointage.CarteAgentRepository;
import com.siege.platform.zone.Zone;
import com.siege.platform.zone.ZoneRepository;
import com.siege.platform.contrat.ContratAgentRepository;
import com.siege.platform.contrat.RenouvellementContratRepository;
import com.siege.platform.materiel.AffectationMaterielRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.siege.platform.common.IdempotencyManager;
import java.util.*;

@RestController
@RequestMapping("/api/agents")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
public class AgentTerrainController {

    private final AgentTerrainService agentTerrainService;
    private final ZoneRepository zoneRepository;
    private final CarteAgentRepository carteAgentRepository;
    private final PieceJustificativeRepository pieceJustificativeRepository;
    private final ContratAgentRepository contratAgentRepository;
    private final RenouvellementContratRepository renouvellementContratRepository;
    private final AffectationMaterielRepository affectationMaterielRepository;
    private final AgentTerrainRepository agentTerrainRepository;
    private final IdempotencyManager idempotencyManager;

    public AgentTerrainController(AgentTerrainService agentTerrainService,
                                  ZoneRepository zoneRepository,
                                  CarteAgentRepository carteAgentRepository,
                                  PieceJustificativeRepository pieceJustificativeRepository,
                                  ContratAgentRepository contratAgentRepository,
                                  RenouvellementContratRepository renouvellementContratRepository,
                                  AffectationMaterielRepository affectationMaterielRepository,
                                  AgentTerrainRepository agentTerrainRepository,
                                  IdempotencyManager idempotencyManager) {
        this.agentTerrainService = agentTerrainService;
        this.zoneRepository = zoneRepository;
        this.carteAgentRepository = carteAgentRepository;
        this.pieceJustificativeRepository = pieceJustificativeRepository;
        this.contratAgentRepository = contratAgentRepository;
        this.renouvellementContratRepository = renouvellementContratRepository;
        this.affectationMaterielRepository = affectationMaterielRepository;
        this.agentTerrainRepository = agentTerrainRepository;
        this.idempotencyManager = idempotencyManager;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAgents() {
        List<AgentTerrain> agents = agentTerrainService.listAll();
        List<Map<String, Object>> response = new ArrayList<>();
        
        // Load all active cards to map them easily
        List<CarteAgent> cartes = carteAgentRepository.findAll();
        Map<UUID, CarteAgent> agentCarteMap = new HashMap<>();
        for (CarteAgent c : cartes) {
            if ("ACTIVE".equals(c.getStatut())) {
                agentCarteMap.put(c.getAgent().getId(), c);
            }
        }

        for (AgentTerrain a : agents) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("nom", a.getNom());
            map.put("prenom", a.getPrenom());
            map.put("contact", a.getContact());
            map.put("telephoneSecondaire", a.getTelephoneSecondaire());
            map.put("situationMatrimoniale", a.getSituationMatrimoniale());
            map.put("nombreEnfants", a.getNombreEnfants());
            map.put("contactUrgenceNom", a.getContactUrgenceNom());
            map.put("contactUrgenceTelephone", a.getContactUrgenceTelephone());
            map.put("contactUrgenceLien", a.getContactUrgenceLien());
            map.put("statut", a.getStatut());
            map.put("zoneNom", a.getZone() != null ? a.getZone().getNom() : "—");
            
            // New fields
            map.put("matricule", a.getMatricule());
            map.put("photoUrl", a.getPhotoUrl());
            map.put("genre", a.getGenre());
            map.put("dateNaissance", a.getDateNaissance() != null ? a.getDateNaissance().toString() : null);
            map.put("lieuNaissance", a.getLieuNaissance());
            map.put("nationalite", a.getNationalite());
            map.put("adresse", a.getAdresse());
            map.put("commune", a.getCommune());
            map.put("ville", a.getVille());
            map.put("email", a.getEmail());
            
            if (a.getCreatedByCoordonnateur() != null) {
                map.put("createdByCoordonnateurId", a.getCreatedByCoordonnateur().getId());
                map.put("createdByCoordonnateurNomPrenom", a.getCreatedByCoordonnateur().getNom() + " " + a.getCreatedByCoordonnateur().getPrenom());
                map.put("createdByCoordonnateurEmail", a.getCreatedByCoordonnateur().getEmail());
            }

            CarteAgent card = agentCarteMap.get(a.getId());
            String qr = card != null ? card.getCodeQr() : null;
            if (qr == null || !qr.startsWith("eyJ")) {
                qr = agentTerrainService.getOrCreateActiveCard(a);
                card = carteAgentRepository.findByAgentIdAndStatut(a.getId(), "ACTIVE").orElse(null);
            }
            map.put("codeQr", qr);
            map.put("identifiantNfc", card != null ? card.getIdentifiantNfc() : null);
            map.put("sourceBiometrie", card != null ? card.getSourceBiometrie() : null);
            response.add(map);
        }
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> ajouterAgent(@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
                                          @RequestBody Map<String, String> payload) {
        String idempotencyKey = idempotencyHeader != null ? idempotencyHeader : payload.get("idempotencyKey");
        if (idempotencyKey != null && !idempotencyKey.isBlank() && idempotencyManager.has(idempotencyKey)) {
            return ResponseEntity.ok(idempotencyManager.get(idempotencyKey));
        }

        String nom = payload.getOrDefault("nom", "").trim();
        String prenom = payload.getOrDefault("prenom", "").trim();
        String contact = payload.getOrDefault("contact", "").trim();
        String zoneIdStr = payload.getOrDefault("zoneId", "").trim();

        if (nom.isEmpty() || prenom.isEmpty() || contact.isEmpty() || zoneIdStr.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tous les champs sont requis."));
        }

        try {
            AgentTerrain agent = agentTerrainService.creerAgentDepuisPayload(payload);
            Map<String, Object> responseBody = Map.of(
                "message", "Agent créé avec succès !",
                "agentId", agent.getId()
            );
            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                idempotencyManager.put(idempotencyKey, responseBody);
            }
            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentTerrain> getAgentById(@PathVariable("id") UUID id) {
        return agentTerrainRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/zones")
    public ResponseEntity<List<Zone>> getZones() {
        return ResponseEntity.ok(zoneRepository.findAll());
    }

    @GetMapping("/{id}/fiche")
    public ResponseEntity<Map<String, Object>> genererFicheAgent(@PathVariable("id") UUID id,
                                                                 @RequestParam(value = "format", defaultValue = "pdf") String format) {
        return ResponseEntity.ok(Map.of(
                "message", "Export fiche agent pret.",
                "format", format,
                "url", "/exports/agents/" + id + "/fiche." + format
        ));
    }

    @PostMapping("/{id}/carte/configurer")
    public ResponseEntity<?> configurerCarte(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload) {
        try {
            String identifiantNfc = payload.get("identifiantNfc");
            String sourceBiometrie = payload.get("sourceBiometrie");
            agentTerrainService.configurerCarte(id, identifiantNfc, sourceBiometrie);
            return ResponseEntity.ok(Map.of("message", "Configuration NFC et biométrie mise à jour avec succès !"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Erreur de configuration"));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le fichier est vide."));
        }
        try {
            java.io.File uploadDir = new java.io.File("uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            String filename = java.util.UUID.randomUUID().toString() + "_" + file.getOriginalFilename().replaceAll("\\s+", "_");
            java.nio.file.Path targetPath = java.nio.file.Paths.get(uploadDir.getAbsolutePath(), filename);
            try (java.io.InputStream in = file.getInputStream()) {
                java.nio.file.Files.copy(in, targetPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            }
            String url = "/uploads/" + filename;
            return ResponseEntity.ok(Map.of("url", url, "name", file.getOriginalFilename()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Erreur lors de l'upload : " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/pieces")
    public ResponseEntity<List<PieceJustificative>> getPieces(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(pieceJustificativeRepository.findByAgentId(id));
    }

    @PostMapping("/{id}/pieces")
    public ResponseEntity<?> ajouterPiece(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload) {
        try {
            AgentTerrain agent = agentTerrainService.listAll().stream()
                    .filter(a -> a.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Agent introuvable ou non autorisé."));

            PieceJustificative piece = new PieceJustificative();
            piece.setAgent(agent);
            piece.setEntreprise(agent.getEntreprise());
            piece.setType(payload.get("type"));
            if (payload.get("dateEmission") != null && !payload.get("dateEmission").trim().isEmpty()) {
                piece.setDateEmission(java.time.LocalDate.parse(payload.get("dateEmission").trim()));
            }
            if (payload.get("dateExpiration") != null && !payload.get("dateExpiration").trim().isEmpty()) {
                piece.setDateExpiration(java.time.LocalDate.parse(payload.get("dateExpiration").trim()));
            }
            piece.setUrlDocument(payload.get("urlDocument"));
            piece.setStatut(payload.getOrDefault("statut", "VALIDE"));
            
            return ResponseEntity.ok(pieceJustificativeRepository.save(piece));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/pieces/{pieceId}")
    public ResponseEntity<?> supprimerPiece(@PathVariable("pieceId") UUID pieceId) {
        if (!pieceJustificativeRepository.existsById(pieceId)) {
            return ResponseEntity.notFound().build();
        }
        pieceJustificativeRepository.deleteById(pieceId);
        return ResponseEntity.ok(Map.of("message", "Pièce administrative supprimée avec succès."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAgent(@PathVariable("id") UUID id) {
        try {
            AgentTerrain agent = agentTerrainService.listAll().stream()
                    .filter(a -> a.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Agent introuvable ou non autorisé."));
            
            pieceJustificativeRepository.findByAgentId(id).forEach(pieceJustificativeRepository::delete);
            carteAgentRepository.findByAgentId(id).forEach(carteAgentRepository::delete);
            // Delete renewals before contracts to respect FK constraint
            contratAgentRepository.findByAgentIdOrderByDateDebutDesc(id).forEach(contrat -> {
                renouvellementContratRepository.findByContratIdOrderByCreeLeDesc(contrat.getId())
                        .forEach(renouvellementContratRepository::delete);
                contratAgentRepository.delete(contrat);
            });
            affectationMaterielRepository.findByAgentIdOrderByDateRemiseDesc(id).forEach(affectationMaterielRepository::delete);
            
            agentTerrainRepository.delete(agent);
            return ResponseEntity.ok(Map.of("message", "Agent supprimé avec succès."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/activer")
    public ResponseEntity<?> activerAgent(@PathVariable("id") UUID id) {
        try {
            AgentTerrain agent = agentTerrainRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Agent introuvable."));
            agent.setStatut("ACTIF");
            agentTerrainRepository.save(agent);
            return ResponseEntity.ok(Map.of("message", "Agent activé."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/finaliser")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> finaliserAgent(@PathVariable("id") UUID id) {
        try {
            AgentTerrain agent = agentTerrainRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Agent introuvable."));
            
            if (!"EN_ATTENTE_FINALISATION_ADMIN".equals(agent.getStatut())) {
                return ResponseEntity.badRequest().body(Map.of("message", "L'agent n'est pas en attente de finalisation."));
            }
            
            agent.setStatut("EN_ATTENTE_CONTRAT_SIGNE");
            agentTerrainRepository.save(agent);
            return ResponseEntity.ok(Map.of("message", "Agent finalisé avec succès."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}
