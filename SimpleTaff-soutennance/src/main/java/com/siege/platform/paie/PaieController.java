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
    private ParametrePaieRepository parametreRepository;

    @Autowired
    private CurrentTenantService tenantService;

    @PostMapping("/calculer")
    public ResponseEntity<?> calculerPaie(@RequestBody PaieRequest request) {
        try {
            paieService.calculerEtGenererBulletin(request);
            return ResponseEntity.ok(Map.of("message", "Bulletin calculé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/periode/{periode}")
    public ResponseEntity<?> getBulletinsByPeriode(@PathVariable String periode) {
        Entreprise entreprise = tenantService.entreprise();
        List<BulletinDePaie> bulletins = bulletinRepository.findByEntrepriseIdAndPeriode(entreprise.getId(), periode);
        
        List<Map<String, Object>> result = bulletins.stream().map(b -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", b.getId());
            map.put("periode", b.getPeriode());
            map.put("salaireBrutEffectif", b.getSalaireBrutEffectif());
            map.put("totalPrimes", b.getTotalPrimes());
            map.put("cotisationCnps", b.getCotisationCnps());
            map.put("cotisationCnam", b.getCotisationCnam());
            map.put("impotSurRevenu", b.getImpotSurRevenu());
            map.put("salaireNetCalcule", b.getSalaireNetCalcule());
            
            Map<String, Object> agentInfo = new java.util.HashMap<>();
            agentInfo.put("id", b.getAgent().getId());
            agentInfo.put("nom", b.getAgent().getNom());
            agentInfo.put("prenom", b.getAgent().getPrenom());
            agentInfo.put("matricule", b.getAgent().getMatricule());
            map.put("agent", agentInfo);
            
            return map;
        }).collect(java.util.stream.Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBulletin(@PathVariable UUID id) {
        return bulletinRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/parametres")
    public ResponseEntity<?> getParametres() {
        Entreprise entreprise = tenantService.entreprise();
        return parametreRepository.findByEntrepriseId(entreprise.getId())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(new ParametrePaie()));
    }

    @PostMapping("/parametres")
    public ResponseEntity<?> saveParametres(@RequestBody ParametrePaie parametreUpdates) {
        try {
            Entreprise entreprise = tenantService.entreprise();
            ParametrePaie parametre = parametreRepository.findByEntrepriseId(entreprise.getId())
                    .orElse(new ParametrePaie());
            
            parametre.setEntreprise(entreprise);
            if (parametreUpdates.getTauxCnps() != null) parametre.setTauxCnps(parametreUpdates.getTauxCnps());
            if (parametreUpdates.getTauxCnam() != null) parametre.setTauxCnam(parametreUpdates.getTauxCnam());
            if (parametreUpdates.getPrimeTransport() != null) parametre.setPrimeTransport(parametreUpdates.getPrimeTransport());
            if (parametreUpdates.getPrimeLogement() != null) parametre.setPrimeLogement(parametreUpdates.getPrimeLogement());
            if (parametreUpdates.getPrimeRendement() != null) parametre.setPrimeRendement(parametreUpdates.getPrimeRendement());

            parametreRepository.save(parametre);
            return ResponseEntity.ok(Map.of("message", "Paramètres enregistrés avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
