package com.siege.platform.config.security;

import com.siege.platform.utilisateur.Utilisateur;
import com.siege.platform.utilisateur.UtilisateurRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    public UserDetailsServiceImpl(UtilisateurRepository utilisateurRepository) {
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Utilisateur user = utilisateurRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable: " + email));

        // Bloquer les comptes suspendus
        if (user.getStatut() == com.siege.platform.common.enums.StatutUtilisateur.SUSPENDU) {
            throw new org.springframework.security.authentication.DisabledException("Votre compte est suspendu. Contactez l'administrateur.");
        }

        // Bloquer si l'entreprise est suspendue ou inactive
        if (user.getEntreprise() != null) {
            com.siege.platform.common.enums.StatutEntreprise status = user.getEntreprise().getStatut();
            if (status == com.siege.platform.common.enums.StatutEntreprise.SUSPENDUE
             || status == com.siege.platform.common.enums.StatutEntreprise.INACTIF) {
                throw new org.springframework.security.authentication.DisabledException("L'abonnement de votre entreprise est suspendu ou inactif.");
            }
        }

        return UserDetailsImpl.build(user);
    }
}
