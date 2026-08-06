package com.siege.platform.utilisateur;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("SUPER_ADMIN")
@Getter
@Setter
public class SuperAdmin extends Utilisateur {
}
