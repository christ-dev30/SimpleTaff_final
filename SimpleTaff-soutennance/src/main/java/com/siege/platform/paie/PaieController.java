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
            
            map.put("retenueAbsence", b.getRetenueAbsence());
            
            String metier = "Non défini";
            if (b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null) {
                metier = b.getAffectation().getPoste().getEmploi().getLibelle();
            }
            map.put("metier", metier);
            
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
    
    @GetMapping("/agent/{agentId}")
    public ResponseEntity<?> getBulletinsByAgent(@PathVariable UUID agentId) {
        List<BulletinDePaie> bulletins = bulletinRepository.findByAgentIdOrderByPeriodeDesc(agentId);
        
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
            map.put("retenueAbsence", b.getRetenueAbsence());
            
            String metier = "Non défini";
            if (b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null) {
                metier = b.getAffectation().getPoste().getEmploi().getLibelle();
            }
            map.put("metier", metier);
            
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

    @GetMapping("/bulletins")
    public ResponseEntity<?> listBulletins() {
        Entreprise entreprise = tenantService.entreprise();
        List<BulletinDePaie> bulletins = bulletinRepository.findByEntrepriseIdOrderByPeriodeDesc(entreprise.getId());
        List<Map<String, Object>> result = bulletins.stream().map(b -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", b.getId());
            map.put("periode", b.getPeriode());
            map.put("agentNom", b.getAgent() != null ? b.getAgent().getNom() + " " + b.getAgent().getPrenom() : "—");
            map.put("salaireNetCalcule", b.getSalaireNetCalcule());
            map.put("joursValides", b.getJoursValides());
            map.put("joursAbsNonJust", b.getJoursAbsenceNonJustifiee());
            map.put("statutPaiement", b.getStatutPaiement());
            return map;
        }).collect(java.util.stream.Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/bulletins/{id}/payer")
    public ResponseEntity<?> payerBulletin(@PathVariable UUID id) {
        return bulletinRepository.findById(id).map(b -> {
            b.setStatutPaiement("PAYE");
            bulletinRepository.save(b);
            return ResponseEntity.ok(Map.of("message", "Bulletin marqué comme payé."));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBulletin(@PathVariable UUID id) {
        return bulletinRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.siege.platform.contrat.ContratAgentRepository contratAgentRepository;

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportBulletinPdf(@PathVariable UUID id, @RequestParam(value = "format", defaultValue = "pdf") String format) {
        return bulletinRepository.findById(id).map(b -> {
            ParametrePaie parametre = parametreRepository.findByEntrepriseId(b.getEntreprise().getId()).orElse(null);
            List<com.siege.platform.contrat.ContratAgent> contrats = contratAgentRepository.findByAgentIdOrderByDateDebutDesc(b.getAgent().getId());
            com.siege.platform.contrat.ContratAgent contrat = contrats.isEmpty() ? null : contrats.get(0);
            byte[] pdfBytes = BulletinPdfBuilder.build(b, parametre, contrat);
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "Bulletin_Paie_" + (b.getAgent().getMatricule() != null ? b.getAgent().getMatricule() : b.getAgent().getNom()) + "_" + b.getPeriode() + ".pdf");
            return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
        }).orElse(ResponseEntity.notFound().build());
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
            if (parametreUpdates.getLieuPaie() != null) parametre.setLieuPaie(parametreUpdates.getLieuPaie());

            parametreRepository.save(parametre);
            return ResponseEntity.ok(Map.of("message", "Paramètres enregistrés avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
