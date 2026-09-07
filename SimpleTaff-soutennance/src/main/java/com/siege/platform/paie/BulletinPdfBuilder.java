package com.siege.platform.paie;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import com.siege.platform.contrat.ContratAgent;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class BulletinPdfBuilder {

    private static final Color C_NAVY     = new Color(22, 49, 58);   // #16313a
    private static final Color C_GREEN    = new Color(140, 200, 100); // #8cc864
    private static final Color C_TEXT     = new Color(100, 110, 120);
    private static final Color C_BLACK    = new Color(50, 60, 70);
    private static final Color C_BLUE     = new Color(30, 144, 255);
    private static final Color C_RED      = new Color(239, 68, 68);
    private static final Color C_LIGHT_BG = new Color(248, 250, 252);
    private static final Color C_NET_BG   = new Color(234, 244, 227);
    private static final Color C_BORDER   = new Color(230, 235, 240);

    private static final DateTimeFormatter DMY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public static byte[] build(BulletinDePaie b, ParametrePaie parametre, ContratAgent contrat) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 40, 36);
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, C_NAVY);
            Font subtitleFont  = FontFactory.getFont(FontFactory.HELVETICA, 8, C_TEXT);
            Font docTitleFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, C_NAVY);
            Font periodBoxLabelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(140, 150, 160));
            Font periodBoxValFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_BLACK);

            Font labelFont     = FontFactory.getFont(FontFactory.HELVETICA, 8, C_TEXT);
            Font valueFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, C_BLACK);
            Font boxTitleFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(140, 150, 160));

            Font tableHeadFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
            Font tableCellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, C_TEXT);
            Font tableCellVal  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, C_BLACK);
            Font sousTotalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, C_NAVY);

            Font summaryLabel  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_NAVY);
            Font summaryValG   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_NAVY);
            Font summaryValR   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_RED);
            Font netLabelFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, C_NAVY);
            Font netValueFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, C_NAVY);

            Font footerFont    = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(170, 180, 190));

            String agentNom = b.getAgent().getNom() + " " + b.getAgent().getPrenom();
            String metier = b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null
                    ? b.getAffectation().getPoste().getEmploi().getLibelle() : "—";

            // ---------------- HEADER ----------------
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{50, 50});

            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph(b.getEntreprise() != null ? b.getEntreprise().getNom() : "SimpleTaff", titleFont));
            leftHeader.addElement(new Paragraph("Généré via SimpleTaff", subtitleFont));
            headerTable.addCell(leftHeader);

            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph titre = new Paragraph("BULLETIN DE PAIE", docTitleFont);
            titre.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(titre);
            headerTable.addCell(rightHeader);

            document.add(headerTable);
            document.add(new Paragraph(" "));

            // ---------------- PÉRIODE DE PAIE / DATE DE PAIE (encadré, comme le modèle) ----------------
            String periodeDu = "—", periodeAu = "—";
            try {
                YearMonth ym = YearMonth.parse(b.getPeriode());
                periodeDu = ym.atDay(1).format(DMY);
                periodeAu = ym.atEndOfMonth().format(DMY);
            } catch (Exception ignored) { }
            LocalDate datePaie = b.getDateCloture() != null ? b.getDateCloture().toLocalDate()
                    : (b.getCreeLe() != null ? b.getCreeLe().toLocalDate() : LocalDate.now());

            PdfPTable periodBox = new PdfPTable(2);
            periodBox.setWidthPercentage(100);
            periodBox.setWidths(new float[]{62, 38});
            addPeriodCell(periodBox, "PÉRIODE DE PAIE", "Du " + periodeDu + "  au  " + periodeAu, periodBoxLabelFont, periodBoxValFont);
            addPeriodCell(periodBox, "DATE DE PAIE", datePaie.format(DMY), periodBoxLabelFont, periodBoxValFont);
            document.add(periodBox);
            document.add(new Paragraph(" "));

            // ---------------- INFO BLOCK (2 colonnes, façon bulletin administratif) ----------------
            String entrepriseNom = b.getEntreprise() != null ? b.getEntreprise().getNom() : "—";
            String entrepriseCnps = orDash(b.getEntreprise() != null ? b.getEntreprise().getNumeroCnps() : null);
            String entrepriseContribuable = orDash(b.getEntreprise() != null ? b.getEntreprise().getNumeroContribuable() : null);
            String matricule = orDash(b.getAgent().getMatricule());
            String equipe = orDash(b.getAgent().getEquipe());
            String categorie = orDash(b.getAgent().getCategorie());
            String salCat = formatVal(b.getSalaireDeBase());
            String nbParts = b.getAgent().getNbParts() != null ? b.getAgent().getNbParts().stripTrailingZeros().toPlainString() : "—";
            String nationalite = orDash(b.getAgent().getNationalite());
            String dateEmbauche = contrat != null && contrat.getDateDebut() != null ? contrat.getDateDebut().format(DMY) : "—";
            String agentCnps = orDash(b.getAgent().getNumeroCnps());
            String lieuPaie = orDash(parametre != null ? parametre.getLieuPaie() : null);

            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50, 50});

            PdfPCell leftBox = new PdfPCell();
            leftBox.setBorder(Rectangle.NO_BORDER);
            leftBox.setBackgroundColor(C_LIGHT_BG);
            leftBox.setPadding(12);
            PdfPTable leftDetails = new PdfPTable(2);
            leftDetails.setWidthPercentage(100);
            leftDetails.setWidths(new float[]{45, 55});
            addInfoRow(leftDetails, "N° CNPS Employeur :", entrepriseCnps, labelFont, valueFont);
            addInfoRow(leftDetails, "N° Contribuable :", entrepriseContribuable, labelFont, valueFont);
            addInfoRow(leftDetails, "Entreprise :", entrepriseNom, labelFont, valueFont);
            addInfoRow(leftDetails, "Matricule :", matricule, labelFont, valueFont);
            addInfoRow(leftDetails, "Équipe :", equipe, labelFont, valueFont);
            addInfoRow(leftDetails, "Catégorie :", categorie, labelFont, valueFont);
            addInfoRow(leftDetails, "Sal. Catégoriel :", salCat + " F CFA", labelFont, valueFont);
            addInfoRow(leftDetails, "Nb Parts (IGR) :", nbParts, labelFont, valueFont);
            addInfoRow(leftDetails, "Nationalité :", nationalite, labelFont, valueFont);
            addInfoRow(leftDetails, "Date embauche :", dateEmbauche, labelFont, valueFont);
            addInfoRow(leftDetails, "N° CNPS Agent :", agentCnps, labelFont, valueFont);
            addInfoRow(leftDetails, "Lieu de paie :", lieuPaie, labelFont, valueFont);
            leftBox.addElement(leftDetails);
            infoTable.addCell(leftBox);

            PdfPCell rightBox = new PdfPCell();
            rightBox.setBorder(Rectangle.NO_BORDER);
            rightBox.setBackgroundColor(C_LIGHT_BG);
            rightBox.setPadding(12);
            PdfPTable rightDetails = new PdfPTable(2);
            rightDetails.setWidthPercentage(100);
            rightDetails.setWidths(new float[]{40, 60});
            addInfoRow(rightDetails, "Nom & Adresse :", agentNom + (b.getAgent().getAdresse() != null ? " — " + b.getAgent().getAdresse() : ""), labelFont, valueFont);
            addInfoRow(rightDetails, "Type de paie :", "Mensuel", labelFont, valueFont);
            addInfoRow(rightDetails, "Département :", orDash(contrat != null ? contrat.getDepartement() : null), labelFont, valueFont);
            addInfoRow(rightDetails, "Emploi :", metier, labelFont, valueFont);
            rightBox.addElement(rightDetails);
            infoTable.addCell(rightBox);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            // ---------------- TABLE GAINS / RETENUES ----------------
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{35, 25, 20, 20});

            addHeaderCell(table, "DÉSIGNATION", tableHeadFont, C_NAVY, Element.ALIGN_LEFT);
            addHeaderCell(table, "BASE / TAUX", tableHeadFont, C_NAVY, Element.ALIGN_CENTER);
            addHeaderCell(table, "GAINS (+)", tableHeadFont, C_NAVY, Element.ALIGN_CENTER);
            addHeaderCell(table, "RETENUES (-)", tableHeadFont, C_NAVY, Element.ALIGN_CENTER);

            BigDecimal totalGains = BigDecimal.ZERO;
            BigDecimal totalRetenues = BigDecimal.ZERO;

            totalGains = totalGains.add(nz(b.getSalaireDeBase()));
            addRow(table, "Salaire de Base", "Mois complet", formatVal(b.getSalaireDeBase()), "-", tableCellFont, tableCellVal);

            List<String[]> primeLignes = new ArrayList<>();
            addPrimeLine(primeLignes, "Prime de Transport", b.getPrimeTransport());
            addPrimeLine(primeLignes, "Prime de Logement", b.getPrimeLogement());
            addPrimeLine(primeLignes, "Prime d'Ancienneté", b.getPrimeAnciennete());
            addPrimeLine(primeLignes, "Prime de Rendement", b.getPrimeRendement());
            addPrimeLine(primeLignes, "Prime de Terrain", b.getPrimeTerrain());
            addPrimeLine(primeLignes, "Prime de Communication", b.getPrimeCommunication());
            addPrimeLine(primeLignes, "Prime de Panier", b.getPrimePanier());
            addPrimeLine(primeLignes, "Prime Exceptionnelle", b.getPrimeExceptionnelle());
            for (String[] ligne : primeLignes) {
                addRow(table, ligne[0], "Forfaitaire", ligne[1], "-", tableCellFont, tableCellVal);
                totalGains = totalGains.add(new BigDecimal(ligne[1]));
            }

            addSousTotalRow(table, "Sous Total Gains", formatMoney(totalGains) + " F CFA", true, sousTotalFont);

            if (b.getJoursAbsenceNonJustifiee() > 0 || nz(b.getRetenueAbsence()).compareTo(BigDecimal.ZERO) > 0) {
                addRow(table, "Absences Non Justifiées", b.getJoursAbsenceNonJustifiee() + " jour(s)", "-", formatVal(b.getRetenueAbsence()), tableCellFont, tableCellVal);
                totalRetenues = totalRetenues.add(nz(b.getRetenueAbsence()));
            }

            String tauxCnps = parametre != null && parametre.getTauxCnps() != null
                    ? parametre.getTauxCnps().multiply(new BigDecimal(100)).setScale(1, java.math.RoundingMode.HALF_UP) + "%" : "—";
            addRow(table, "Cotisation CNPS", tauxCnps, "-", formatVal(b.getCotisationCnps()), tableCellFont, tableCellVal);
            totalRetenues = totalRetenues.add(nz(b.getCotisationCnps()));

            String tauxCnam = parametre != null && parametre.getTauxCnam() != null
                    ? parametre.getTauxCnam().multiply(new BigDecimal(100)).setScale(1, java.math.RoundingMode.HALF_UP) + "%" : "—";
            addRow(table, "Cotisation CNAM", tauxCnam, "-", formatVal(b.getCotisationCnam()), tableCellFont, tableCellVal);
            totalRetenues = totalRetenues.add(nz(b.getCotisationCnam()));

            if (nz(b.getImpotSurRevenu()).compareTo(BigDecimal.ZERO) > 0) {
                addRow(table, "Impôt sur Revenu", "—", "-", formatVal(b.getImpotSurRevenu()), tableCellFont, tableCellVal);
                totalRetenues = totalRetenues.add(nz(b.getImpotSurRevenu()));
            }

            addSousTotalRow(table, "Sous Total Retenues", formatMoney(totalRetenues) + " F CFA", false, sousTotalFont);

            document.add(table);
            document.add(new Paragraph(" "));

            // ---------------- SUMMARY BOX ----------------
            PdfPTable summaryLayout = new PdfPTable(2);
            summaryLayout.setWidthPercentage(100);
            summaryLayout.setWidths(new float[]{45, 55});

            PdfPCell reglementBox = new PdfPCell();
            reglementBox.setBorder(Rectangle.BOX);
            reglementBox.setBorderColor(C_BORDER);
            reglementBox.setBorderWidth(1f);
            reglementBox.setPadding(12);
            reglementBox.setPaddingRight(20);
            reglementBox.addElement(new Phrase("RÈGLEMENT", periodBoxLabelFont));
            boolean paye = "PAYE".equalsIgnoreCase(b.getStatutPaiement());
            Font reglementValFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11,
                    paye ? new Color(34, 139, 60) : new Color(200, 120, 20));
            reglementBox.addElement(new Phrase(paye ? "PAYÉ" : "EN ATTENTE", reglementValFont));
            summaryLayout.addCell(reglementBox);

            PdfPCell summaryBox = new PdfPCell();
            summaryBox.setBorder(Rectangle.NO_BORDER);
            summaryBox.setBackgroundColor(C_NET_BG);
            summaryBox.setPadding(15);

            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(100);
            totalsTable.setWidths(new float[]{40, 60});

            PdfPCell lbl1 = new PdfPCell(new Phrase("Total Gains", summaryLabel));
            lbl1.setBorder(Rectangle.NO_BORDER); lbl1.setPaddingBottom(10);
            PdfPCell val1 = new PdfPCell(new Phrase(formatMoney(totalGains) + " F CFA", summaryValG));
            val1.setBorder(Rectangle.NO_BORDER); val1.setHorizontalAlignment(Element.ALIGN_RIGHT); val1.setPaddingBottom(10);
            totalsTable.addCell(lbl1); totalsTable.addCell(val1);

            PdfPCell lbl2 = new PdfPCell(new Phrase("Total Retenues", summaryLabel));
            lbl2.setBorder(Rectangle.NO_BORDER); lbl2.setPaddingBottom(12);
            PdfPCell val2 = new PdfPCell(new Phrase(formatMoney(totalRetenues) + " F CFA", summaryValR));
            val2.setBorder(Rectangle.NO_BORDER); val2.setHorizontalAlignment(Element.ALIGN_RIGHT); val2.setPaddingBottom(12);
            totalsTable.addCell(lbl2); totalsTable.addCell(val2);

            PdfPCell sep = new PdfPCell();
            sep.setColspan(2);
            sep.setBorder(Rectangle.BOTTOM);
            sep.setBorderColor(new Color(200, 220, 190));
            sep.setBorderWidth(1f);
            sep.setPaddingBottom(10);
            totalsTable.addCell(sep);

            PdfPCell lbl3 = new PdfPCell(new Phrase("\nNET À\nPAYER", netLabelFont));
            lbl3.setBorder(Rectangle.NO_BORDER); lbl3.setPaddingTop(10);
            PdfPCell val3 = new PdfPCell(new Phrase("\n" + formatMoney(b.getSalaireNetCalcule()) + " F\nCFA", netValueFont));
            val3.setBorder(Rectangle.NO_BORDER); val3.setHorizontalAlignment(Element.ALIGN_RIGHT); val3.setPaddingTop(10);
            totalsTable.addCell(lbl3); totalsTable.addCell(val3);

            summaryBox.addElement(totalsTable);
            summaryLayout.addCell(summaryBox);

            document.add(summaryLayout);

            // ---------------- FOOTER ----------------
            document.add(new Paragraph(" "));
            document.add(new Paragraph(" "));
            Paragraph p1 = new Paragraph("Pour faire valoir ce que de droit.", footerFont);
            p1.setAlignment(Element.ALIGN_CENTER);
            document.add(p1);

            Paragraph p2 = new Paragraph("Généré le " + LocalDate.now().format(DMY) + " par SimpleTaff", footerFont);
            p2.setAlignment(Element.ALIGN_CENTER);
            document.add(p2);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return new byte[0];
        }
    }

    private static void addPrimeLine(List<String[]> lignes, String label, BigDecimal montant) {
        if (montant != null && montant.compareTo(BigDecimal.ZERO) > 0) {
            lignes.add(new String[]{label, formatVal(montant)});
        }
    }

    private static BigDecimal nz(BigDecimal val) {
        return val != null ? val : BigDecimal.ZERO;
    }

    private static String orDash(String val) {
        return (val == null || val.isBlank()) ? "—" : val;
    }

    private static String formatVal(BigDecimal val) {
        if (val == null) return "0";
        return String.format(java.util.Locale.US, "%.0f", val);
    }

    private static String formatMoney(BigDecimal val) {
        if (val == null) return "0.00";
        return String.format(java.util.Locale.US, "%.2f", val);
    }

    private static void addPeriodCell(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell cell = new PdfPCell();
        cell.setBorder(Rectangle.BOX);
        cell.setBorderColor(C_BORDER);
        cell.setBorderWidth(1f);
        cell.setBackgroundColor(C_LIGHT_BG);
        cell.setPadding(8);
        cell.addElement(new Phrase(label, labelFont));
        cell.addElement(new Phrase(value, valueFont));
        table.addCell(cell);
    }

    private static void addInfoRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingBottom(6);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value, valueFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPaddingBottom(6);
        table.addCell(c2);
    }

    private static void addHeaderCell(PdfPTable table, String text, Font font, Color bg, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setPaddingTop(8);
        cell.setPaddingBottom(8);
        cell.setPaddingLeft(5);
        cell.setPaddingRight(5);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setHorizontalAlignment(align);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        table.addCell(cell);
    }

    private static void addRow(PdfPTable table, String col1, String col2, String col3, String col4, Font textFont, Font valFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(col1, textFont));
        c1.setBorder(Rectangle.BOTTOM); c1.setBorderColor(C_BORDER); c1.setBorderWidth(1f);
        c1.setPaddingTop(10); c1.setPaddingBottom(10); c1.setPaddingLeft(5);

        PdfPCell c2 = new PdfPCell(new Phrase(col2, textFont));
        c2.setBorder(Rectangle.BOTTOM); c2.setBorderColor(C_BORDER); c2.setBorderWidth(1f);
        c2.setPaddingTop(10); c2.setPaddingBottom(10); c2.setHorizontalAlignment(Element.ALIGN_CENTER);

        PdfPCell c3 = new PdfPCell(new Phrase(col3, valFont));
        c3.setBorder(Rectangle.BOTTOM); c3.setBorderColor(C_BORDER); c3.setBorderWidth(1f);
        c3.setPaddingTop(10); c3.setPaddingBottom(10); c3.setHorizontalAlignment(Element.ALIGN_CENTER);

        PdfPCell c4 = new PdfPCell(new Phrase(col4, valFont));
        c4.setBorder(Rectangle.BOTTOM); c4.setBorderColor(C_BORDER); c4.setBorderWidth(1f);
        c4.setPaddingTop(10); c4.setPaddingBottom(10); c4.setHorizontalAlignment(Element.ALIGN_CENTER);

        table.addCell(c1);
        table.addCell(c2);
        table.addCell(c3);
        table.addCell(c4);
    }

    private static void addSousTotalRow(PdfPTable table, String label, String value, boolean isGains, Font font) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        c1.setColspan(2);
        c1.setBorder(Rectangle.TOP); c1.setBorderColor(C_NAVY); c1.setBorderWidth(1.2f);
        c1.setPaddingTop(8); c1.setPaddingBottom(8); c1.setPaddingLeft(5);
        c1.setBackgroundColor(C_LIGHT_BG);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(isGains ? value : "", font));
        c2.setBorder(Rectangle.TOP); c2.setBorderColor(C_NAVY); c2.setBorderWidth(1.2f);
        c2.setPaddingTop(8); c2.setPaddingBottom(8); c2.setHorizontalAlignment(Element.ALIGN_CENTER);
        c2.setBackgroundColor(C_LIGHT_BG);
        table.addCell(c2);

        PdfPCell c3 = new PdfPCell(new Phrase(!isGains ? value : "", font));
        c3.setBorder(Rectangle.TOP); c3.setBorderColor(C_NAVY); c3.setBorderWidth(1.2f);
        c3.setPaddingTop(8); c3.setPaddingBottom(8); c3.setHorizontalAlignment(Element.ALIGN_CENTER);
        c3.setBackgroundColor(C_LIGHT_BG);
        table.addCell(c3);
    }
}
