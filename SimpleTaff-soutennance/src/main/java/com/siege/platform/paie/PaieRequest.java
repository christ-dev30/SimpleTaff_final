package com.siege.platform.paie;

import lombok.Data;
import java.util.UUID;

@Data
public class PaieRequest {
    private UUID agentId;
    private String periode; // YYYY-MM
    private int joursPrevus;
    private int joursValides;
    private int joursAbsenceNonJustifiee;
}
