package com.siege.platform.utilisateur;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("ADMIN_ENTREPRISE")
@Getter
@Setter
public class AdminEntreprise extends Utilisateur {
}
