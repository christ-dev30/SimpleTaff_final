package com.siege.platform.paie;

import lombok.Data;
import java.util.UUID;

@Data
public class GenererBulletinRequest {
    private UUID affectationId;
    private String periode; // YYYY-MM
    private int joursPrevus;
    private int joursValides;
    private int joursAbsJustCourte;
    private int joursAbsJustLongue;
    private int joursAbsNonJust;
    private int joursCongePaye;
}
