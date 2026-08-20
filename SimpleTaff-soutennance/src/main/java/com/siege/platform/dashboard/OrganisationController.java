package com.siege.platform.dashboard;

import com.siege.platform.common.enums.StatutUtilisateur;
import com.siege.platform.entreprise.Entreprise;
import com.siege.platform.emploi.Emploi;
import com.siege.platform.emploi.EmploiRepository;
import com.siege.platform.config.security.JwtUtils;
import com.siege.platform.structuredemandeuse.Site;
import com.siege.platform.structuredemandeuse.SiteRepository;
import com.siege.platform.structuredemandeuse.StructureDemandeuse;
import com.siege.platform.structuredemandeuse.StructureDemandeuseRepository;
import com.siege.platform.utilisateur.Coordonnateur;
import com.siege.platform.utilisateur.Employeur;
import com.siege.platform.utilisateur.Utilisateur;
import com.siege.platform.utilisateur.UtilisateurRepository;
import com.siege.platform.zone.Zone;
import com.siege.platform.zone.ZoneRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Controller exposing CRUD endpoints for the full organisational structure:
 *  - Zones géographiques
 *  - Coordonnateurs
 *  - Emplois (catalogue)
 *  - Structures demandeuses (clients) + Sites + Employeurs
 *
 *  Toutes les requêtes GET filtrent par entreprise du token JWT (multi-tenant).
 */
@RestController
@RequestMapping("/api/organisation")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'COORDONNATEUR', 'SUPER_ADMIN')")
public class OrganisationController {

    private final ZoneRepository zoneRepo;
    private final UtilisateurRepository utilisateurRepo;
    private final EmploiRepository emploiRepo;
    private final StructureDemandeuseRepository structureRepo;
    private final SiteRepository siteRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public OrganisationController(ZoneRepository zoneRepo,
                                   UtilisateurRepository utilisateurRepo,
                                   EmploiRepository emploiRepo,
                                   StructureDemandeuseRepository structureRepo,
                                   SiteRepository siteRepo,
                                   PasswordEncoder passwordEncoder,
                                   JwtUtils jwtUtils) {
        this.zoneRepo = zoneRepo;
        this.utilisateurRepo = utilisateurRepo;
        this.emploiRepo = emploiRepo;
        this.structureRepo = structureRepo;
        this.siteRepo = siteRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    // ============================= ZONES =============================

    @GetMapping("/zones")
    public ResponseEntity<List<Map<String, Object>>> getZones(HttpServletRequest request) {
        Entreprise entreprise = getEntrepriseFromToken(request);
        List<Zone> zones = zoneRepo.findByEntrepriseId(entreprise.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Zone z : zones) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", z.getId());
            m.put("nom", z.getNom());
            m.put("description", z.getDescription());
            m.put("perimetre", z.getPerimetre());
            m.put("statut", z.getStatut());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/zones")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> createZone(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Entreprise entreprise = getEntrepriseFromToken(request);
            String nom = readRequiredText(payload, "nom", "Le nom de la zone est obligatoire.");
            Zone zone = new Zone();
            zone.setEntreprise(entreprise);
            zone.setNom(nom);
            zone.setDescription(readOptionalText(payload, "description"));
            zone.setPerimetre(readOptionalText(payload, "perimetre"));
            zone.setStatut("ACTIF");
            Zone saved = zoneRepo.save(zone);
            return ResponseEntity.ok(Map.of("message", "Zone créée !", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", safeMessage(e)));
        }
    }

    @DeleteMapping("/zones/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteZone(@PathVariable("id") UUID id) {
        if (!zoneRepo.existsById(id)) return ResponseEntity.notFound().build();
        zoneRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Zone supprimée."));
    }

    // ========================= COORDONNATEURS =========================

    @GetMapping("/coordonnateurs")
    public ResponseEntity<List<Map<String, Object>>> getCoordonnateurs(HttpServletRequest request) {
        Entreprise entreprise = getEntrepriseFromToken(request);
        // Requête JPQL typée — pas d'instanceof sur proxy Hibernate
        List<Coordonnateur> coords = utilisateurRepo.findCoordsByEntrepriseId(entreprise.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Coordonnateur c : coords) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.getId());
            m.put("nom", c.getNom());
            m.put("prenom", c.getPrenom());
            m.put("email", c.getEmail());
            m.put("statut", c.getStatut());
            m.put("zoneNom", c.getZone() != null ? c.getZone().getNom() : null);
            m.put("zoneId", c.getZone() != null ? c.getZone().getId() : null);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/coordonnateurs")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> createCoordonnateur(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Entreprise entreprise = getEntrepriseFromToken(request);

            if (entreprise.getFormuleAbonnement() == com.siege.platform.common.enums.FormuleAbonnement.PRO) {
                long coordCount = utilisateurRepo.findCoordsByEntrepriseId(entreprise.getId()).size();
                if (coordCount >= 4) {
                    return ResponseEntity.badRequest().body(Map.of("message", "La formule PRO est limitée à 4 coordonnateurs maximum."));
                }
            }

            String email = (String) payload.get("email");
            if (utilisateurRepo.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Un compte avec cet email existe déjà."));
            }

            Coordonnateur coord = new Coordonnateur();
            coord.setNom((String) payload.get("nom"));
            coord.setPrenom((String) payload.get("prenom"));
            coord.setEmail(email);
            coord.setMotDePasseHash(passwordEncoder.encode((String) payload.get("motDePasse")));
            coord.setEntreprise(entreprise);
            coord.setStatut(StatutUtilisateur.ACTIF);

            if (payload.get("zoneId") != null) {
                UUID zoneId = UUID.fromString((String) payload.get("zoneId"));
                zoneRepo.findById(zoneId).ifPresent(coord::setZone);
            }

            Utilisateur saved = utilisateurRepo.save(coord);
            return ResponseEntity.ok(Map.of("message", "Coordonnateur créé !", "id", saved.getId()));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(Map.of("message", "Conflit de données : L'adresse email est déjà utilisée."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "Erreur inconnue"));
        }
    }

    @DeleteMapping("/coordonnateurs/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteCoordonnateur(@PathVariable("id") UUID id) {
        Optional<Utilisateur> opt = utilisateurRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        utilisateurRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Coordonnateur supprimé."));
    }

    @PutMapping("/coordonnateurs/{id}/password")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateCoordonnateurPassword(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload) {
        Optional<Utilisateur> opt = utilisateurRepo.findById(id);
        if (opt.isEmpty() || !(opt.get() instanceof Coordonnateur)) return ResponseEntity.notFound().build();
        String newPassword = payload.get("motDePasse");
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));
        }
        Utilisateur user = opt.get();
        user.setMotDePasseHash(passwordEncoder.encode(newPassword));
        utilisateurRepo.save(user);
        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    // ========================= EMPLOIS (CATALOGUE) =========================

    @GetMapping("/emplois")
    public ResponseEntity<List<Map<String, Object>>> getEmplois(HttpServletRequest request) {
        Entreprise entreprise = getEntrepriseFromToken(request);
        List<Emploi> emplois = emploiRepo.findByEntrepriseId(entreprise.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Emploi e : emplois) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", e.getId());
            m.put("libelle", e.getLibelle());
            m.put("description", e.getDescription());
            m.put("categorie", e.getCategorie());
            m.put("competencesRequises", e.getCompetencesRequises());
            m.put("salaireBrutReference", e.getSalaireBrutReference());
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/emplois")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> createEmploi(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Entreprise entreprise = getEntrepriseFromToken(request);
            String libelle = (String) payload.get("libelle");

            boolean exists = emploiRepo.findByEntrepriseId(entreprise.getId()).stream()
                    .anyMatch(e -> e.getLibelle().equalsIgnoreCase(libelle));
            if (exists) {
                return ResponseEntity.badRequest().body(Map.of("message", "Un emploi avec ce nom existe déjà pour cette entreprise."));
            }

            Emploi emploi = new Emploi();
            emploi.setEntreprise(entreprise);
            emploi.setLibelle(libelle);
            emploi.setDescription((String) payload.get("description"));
            emploi.setCategorie((String) payload.get("categorie"));
            emploi.setCompetencesRequises((String) payload.get("competencesRequises"));
            if (payload.get("salaireBrutReference") != null) {
                emploi.setSalaireBrutReference(new java.math.BigDecimal(payload.get("salaireBrutReference").toString()));
            }
            Emploi saved = emploiRepo.save(emploi);
            return ResponseEntity.ok(Map.of("message", "Emploi créé !", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/emplois/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteEmploi(@PathVariable("id") UUID id) {
        if (!emploiRepo.existsById(id)) return ResponseEntity.notFound().build();
        emploiRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Emploi supprimé."));
    }

    // ====================== STRUCTURES DEMANDEUSES (CLIENTS) ======================

    @GetMapping("/structures")
    public ResponseEntity<List<Map<String, Object>>> getStructures(HttpServletRequest request) {
        Entreprise entreprise = getEntrepriseFromToken(request);
        List<StructureDemandeuse> structures = structureRepo.findByEntrepriseId(entreprise.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (StructureDemandeuse s : structures) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("raisonSociale", s.getRaisonSociale());
            m.put("secteur", s.getSecteur());
            m.put("besoinsRecurrents", Boolean.TRUE.equals(s.getBesoinsRecurrents()));
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/structures")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> createStructure(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Entreprise entreprise = getEntrepriseFromToken(request);
            StructureDemandeuse s = new StructureDemandeuse();
            s.setEntreprise(entreprise);
            s.setRaisonSociale((String) payload.get("raisonSociale"));
            s.setSecteur((String) payload.get("secteur"));
            s.setBesoinsRecurrents(Boolean.TRUE.equals(payload.get("besoinsRecurrents")));
            StructureDemandeuse saved = structureRepo.save(s);
            return ResponseEntity.ok(Map.of("message", "Structure créée !", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/structures/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteStructure(@PathVariable("id") UUID id) {
        if (!structureRepo.existsById(id)) return ResponseEntity.notFound().build();
        structureRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Structure supprimée."));
    }

    // ========================= SITES =========================

    @GetMapping("/sites")
    public ResponseEntity<List<Map<String, Object>>> getSites(HttpServletRequest request) {
        Entreprise entreprise = getEntrepriseFromToken(request);
        List<Site> sites = siteRepo.findByEntrepriseId(entreprise.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Site s : sites) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("nom", s.getNom());
            m.put("adresse", s.getAdresse());
            m.put("zoneNom", s.getZone() != null ? s.getZone().getNom() : "—");
            m.put("structureNom", s.getStructureDemandeuse() != null ? s.getStructureDemandeuse().getRaisonSociale() : "—");
            m.put("structureId", s.getStructureDemandeuse() != null ? s.getStructureDemandeuse().getId() : null);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/sites")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> createSite(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Site site = new Site();
            site.setNom((String) payload.get("nom"));
            site.setAdresse((String) payload.get("adresse"));

            String token = request.getHeader("Authorization").substring(7);
            UUID entrepriseId = jwtUtils.getEntrepriseIdFromJwtToken(token);
            if (entrepriseId != null) {
                Entreprise entreprise = new Entreprise();
                entreprise.setId(entrepriseId);
                site.setEntreprise(entreprise);
            }

            if (payload.get("structureId") != null) {
                UUID structureId = UUID.fromString((String) payload.get("structureId"));
                structureRepo.findById(structureId).ifPresent(site::setStructureDemandeuse);
            }
            if (payload.get("zoneId") != null) {
                UUID zoneId = UUID.fromString((String) payload.get("zoneId"));
                zoneRepo.findById(zoneId).ifPresent(site::setZone);
            }

            Site saved = siteRepo.save(site);
            return ResponseEntity.ok(Map.of("message", "Site créé !", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/sites/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteSite(@PathVariable("id") UUID id) {
        if (!siteRepo.existsById(id)) return ResponseEntity.notFound().build();
        siteRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Site supprimé."));
    }

    // ====================== EMPLOYEURS ======================

    @GetMapping("/employeurs")
    public ResponseEntity<List<Map<String, Object>>> getEmployeurs(HttpServletRequest request) {
        Entreprise entreprise = getEntrepriseFromToken(request);
        // Requête JPQL typée — évite instanceof sur proxy Hibernate
        List<Employeur> employeurs = utilisateurRepo.findEmployeursByEntrepriseId(entreprise.getId());
        List<Map<String, Object>> result = new ArrayList<>();
        for (Employeur emp : employeurs) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", emp.getId());
            m.put("nom", emp.getNom());
            m.put("prenom", emp.getPrenom());
            m.put("email", emp.getEmail());
            m.put("statut", emp.getStatut());
            m.put("structureNom", emp.getStructureDemandeuse() != null ? emp.getStructureDemandeuse().getRaisonSociale() : "—");
            m.put("structureId", emp.getStructureDemandeuse() != null ? emp.getStructureDemandeuse().getId() : null);
            List<String> siteNoms = new ArrayList<>();
            if (emp.getSites() != null) {
                for (Site s : emp.getSites()) {
                    siteNoms.add(s.getNom());
                }
            }
            m.put("sites", siteNoms);
            result.add(m);
        }
        return ResponseEntity.ok(result);
    }

    @PostMapping("/employeurs")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> createEmployeur(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Entreprise entreprise = getEntrepriseFromToken(request);
            String email = (String) payload.get("email");
            if (utilisateurRepo.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Un compte avec cet email existe déjà."));
            }

            Employeur emp = new Employeur();
            emp.setNom((String) payload.get("nom"));
            emp.setPrenom((String) payload.get("prenom"));
            emp.setEmail(email);
            emp.setMotDePasseHash(passwordEncoder.encode((String) payload.get("motDePasse")));
            emp.setEntreprise(entreprise);
            emp.setStatut(StatutUtilisateur.ACTIF);

            if (payload.get("structureId") != null) {
                UUID structureId = UUID.fromString((String) payload.get("structureId"));
                structureRepo.findById(structureId).ifPresent(emp::setStructureDemandeuse);
            }

            if (payload.get("siteIds") != null) {
                List<?> siteIds = (List<?>) payload.get("siteIds");
                Set<Site> sitesSet = new HashSet<>();
                for (Object idObj : siteIds) {
                    UUID siteId = UUID.fromString(idObj.toString());
                    siteRepo.findById(siteId).ifPresent(sitesSet::add);
                }
                emp.setSites(sitesSet);
            }

            Utilisateur saved = utilisateurRepo.save(emp);
            return ResponseEntity.ok(Map.of("message", "Employeur créé !", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/employeurs/{id}")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteEmployeur(@PathVariable("id") UUID id) {
        Optional<Utilisateur> opt = utilisateurRepo.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        utilisateurRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Employeur supprimé."));
    }

    @PutMapping("/employeurs/{id}/password")
    @PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
    public ResponseEntity<?> updateEmployeurPassword(@PathVariable("id") UUID id, @RequestBody Map<String, String> payload) {
        Optional<Utilisateur> opt = utilisateurRepo.findById(id);
        if (opt.isEmpty() || !(opt.get() instanceof Employeur)) return ResponseEntity.notFound().build();
        String newPassword = payload.get("motDePasse");
        if (newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));
        }
        Utilisateur user = opt.get();
        user.setMotDePasseHash(passwordEncoder.encode(newPassword));
        utilisateurRepo.save(user);
        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    // =================== HELPER ===================

    private Entreprise getEntrepriseFromToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) throw new RuntimeException("Token manquant.");
        String token = header.substring(7);
        String email = jwtUtils.getUserNameFromJwtToken(token);
        Utilisateur user = utilisateurRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
        if (user.getEntreprise() == null) throw new RuntimeException("Aucune entreprise associée à ce compte.");
        return user.getEntreprise();
    }

    private String readRequiredText(Map<String, Object> payload, String key, String message) {
        String value = readOptionalText(payload, key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private String readOptionalText(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private String safeMessage(Exception e) {
        return e.getMessage() != null ? e.getMessage() : "Impossible de creer la zone.";
    }
}
