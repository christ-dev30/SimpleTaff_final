package com.siege.platform.paie;

import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import com.siege.platform.structuredemandeuse.StructureDemandeuseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/paie/factures")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class FactureController {

    private static final BigDecimal TAUX_TVA = new BigDecimal("0.18");

    private final FactureRepository factureRepository;
    private final StructureDemandeuseRepository structureRepository;
    private final CurrentTenantService tenantService;

    public FactureController(FactureRepository factureRepository,
                             StructureDemandeuseRepository structureRepository,
                             CurrentTenantService tenantService) {
        this.factureRepository = factureRepository;
        this.structureRepository = structureRepository;
        this.tenantService = tenantService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        Entreprise entreprise = tenantService.entreprise();
        List<Map<String, Object>> response = factureRepository.findByEntrepriseIdOrderByDateEmissionDesc(entreprise.getId())
                .stream().map(this::toMap).toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generer")
    public ResponseEntity<?> generer(@RequestBody Map<String, Object> payload) {
        Entreprise entreprise = tenantService.entreprise();

        Object structureIdRaw = payload.get("structureId");
        if (structureIdRaw == null || structureIdRaw.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Client (structure demandeuse) requis."));
        }
        UUID structureId = UUID.fromString(structureIdRaw.toString());
        StructureDemandeuse structure = structureRepository.findById(structureId)
                .orElseThrow(() -> new IllegalArgumentException("Structure demandeuse introuvable."));

        String periode = (String) payload.get("periode");
        if (periode == null || periode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Période requise."));
        }

        Object montantRaw = payload.get("montant");
        if (montantRaw == null || montantRaw.toString().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Montant requis."));
        }
        BigDecimal montantTtc = new BigDecimal(montantRaw.toString());
        BigDecimal montantHt = montantTtc.divide(BigDecimal.ONE.add(TAUX_TVA), 2, RoundingMode.HALF_UP);
        BigDecimal montantTva = montantTtc.subtract(montantHt);

        String rapportUrl = payload.get("rapportUrl") != null ? payload.get("rapportUrl").toString() : "";

        Facture facture = new Facture();
        facture.setEntreprise(entreprise);
        facture.setStructureDemandeuse(structure);
        facture.setPeriode(periode);
        facture.setMontantFacture(montantTtc);
        facture.setMontantHt(montantHt);
        facture.setMontantTva(montantTva);
        facture.setMontantTtc(montantTtc);
        facture.setRapportPointageUrl(rapportUrl);
        facture.setStatutPaiement("EN_ATTENTE");
        facture.setDateEmission(LocalDateTime.now());

        long compteur = factureRepository.findByEntrepriseIdOrderByDateEmissionDesc(entreprise.getId()).size() + 1;
        facture.setNumeroFacture("FAC-" + java.time.Year.now().getValue() + "-" + String.format("%04d", compteur));

        Facture saved = factureRepository.save(facture);
        return ResponseEntity.ok(toMap(saved));
    }

    @PostMapping("/{id}/payer")
    public ResponseEntity<?> payer(@PathVariable UUID id) {
        return factureRepository.findById(id).map(f -> {
            f.setStatutPaiement("PAYE");
            factureRepository.save(f);
            return ResponseEntity.ok(Map.of("message", "Facture marquée comme payée."));
        }).orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toMap(Facture f) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", f.getId());
        map.put("numeroFacture", f.getNumeroFacture());
        map.put("dateEmission", f.getDateEmission());
        map.put("periode", f.getPeriode());
        map.put("clientNom", f.getStructureDemandeuse() != null ? f.getStructureDemandeuse().getRaisonSociale() : "—");
        map.put("montantFacture", f.getMontantFacture());
        map.put("montantHt", f.getMontantHt());
        map.put("montantTva", f.getMontantTva());
        map.put("montantTtc", f.getMontantTtc());
        map.put("statutPaiement", f.getStatutPaiement());
        map.put("modePaiement", f.getModePaiement());
        map.put("rapportPointageUrl", f.getRapportPointageUrl());
        return map;
    }
}
