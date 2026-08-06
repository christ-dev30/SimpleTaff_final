package com.siege.platform.config;

import com.siege.platform.common.enums.StatutUtilisateur;
import com.siege.platform.utilisateur.SuperAdmin;
import com.siege.platform.utilisateur.UtilisateurRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    public CommandLineRunner initSuperAdmin(UtilisateurRepository utilisateurRepository) {
        return args -> {
            String email = "superadmin.secure@simpletaff.com";
            if (utilisateurRepository.findByEmail(email).isEmpty()) {
                logger.info("Création du compte SuperAdmin par défaut...");
                SuperAdmin superAdmin = new SuperAdmin();
                superAdmin.setNom("Super");
                superAdmin.setPrenom("Admin");
                superAdmin.setEmail(email);
                // Hash pour le mot de passe: St@ff-Super-2026!Q7
                superAdmin.setMotDePasseHash("$2a$10$NkwsQhJ9ZEC/GyHG8DNCVOQ0rY1/xGOi2uZRbRallW.3I1zASgbXG");
                superAdmin.setStatut(StatutUtilisateur.ACTIF);
                
                utilisateurRepository.save(superAdmin);
                logger.info("Compte SuperAdmin créé avec succès ({}).", email);
            } else {
                logger.info("Le compte SuperAdmin existe déjà.");
            }
        };
    }
}
