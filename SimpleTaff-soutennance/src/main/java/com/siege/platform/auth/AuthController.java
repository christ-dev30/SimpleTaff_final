package com.siege.platform.auth;

import com.siege.platform.config.security.JwtUtils;
import com.siege.platform.config.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final com.siege.platform.utilisateur.UtilisateurRepository utilisateurRepository;
    private final jakarta.persistence.EntityManager entityManager;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtUtils jwtUtils,
                          com.siege.platform.utilisateur.UtilisateurRepository utilisateurRepository,
                          jakarta.persistence.EntityManager entityManager) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.utilisateurRepository = utilisateurRepository;
        this.entityManager = entityManager;
    }

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                roles.get(0)));
    }

    @org.springframework.web.bind.annotation.GetMapping("/users-debug")
    public ResponseEntity<?> listUsersDebug() {
        return ResponseEntity.ok(utilisateurRepository.findAll().stream().map(u -> {
            java.util.Map<String, Object> m = new java.util.HashMap<>();
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("statut", u.getStatut());
            m.put("entreprise", u.getEntreprise() != null ? u.getEntreprise().getNom() : null);
            m.put("motDePasseHash", u.getMotDePasseHash());
            return m;
        }).collect(Collectors.toList()));
    }

    @org.springframework.web.bind.annotation.GetMapping("/db-debug")
    public ResponseEntity<?> dbDebug() {
        java.util.Map<String, Object> res = new java.util.HashMap<>();
        try {
            List<?> migrations = entityManager.createNativeQuery(
                "SELECT version, description, script, success FROM flyway_schema_history ORDER BY installed_rank DESC"
            ).getResultList();
            res.put("migrations", migrations);

            List<?> columns = entityManager.createNativeQuery(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'piece_justificative'"
            ).getResultList();
            res.put("columns", columns);
        } catch (Exception e) {
            res.put("error", e.getMessage());
        }
        return ResponseEntity.ok(res);
    }
}
