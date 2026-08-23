package com.siege.platform.paie;

import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.common.CurrentTenantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/paie")
public class PaieController {

    @Autowired
    private PaieCalculService paieService;

    @Autowired
    private BulletinDePaieRepository bulletinRepository;

    @Autowired
    private CurrentTenantService tenantService;

    @PostMapping("/calculer")
    public ResponseEntity<?> calculerPaie(@RequestBody PaieRequest request) {
        try {
            BulletinDePaie bulletin = paieService.calculerEtGenererBulletin(request);
            return ResponseEntity.ok(Map.of(
                    "message", "Bulletin calculé avec succès",
                    "bulletin", bulletin
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/periode/{periode}")
    public ResponseEntity<?> getBulletinsByPeriode(@PathVariable String periode) {
        Entreprise entreprise = tenantService.entreprise();
        List<BulletinDePaie> bulletins = bulletinRepository.findByEntrepriseIdAndPeriode(entreprise.getId(), periode);
        return ResponseEntity.ok(bulletins);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBulletin(@PathVariable UUID id) {
        return bulletinRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
