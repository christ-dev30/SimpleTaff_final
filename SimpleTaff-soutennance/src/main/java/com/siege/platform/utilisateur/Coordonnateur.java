package com.siege.platform.utilisateur;

import com.siege.platform.zone.Zone;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("COORDONNATEUR")
@Getter
@Setter
public class Coordonnateur extends Utilisateur {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;
}
