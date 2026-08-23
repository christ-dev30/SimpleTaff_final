package com.siege.platform.paie;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class BulletinPdfBuilder {

    private static final Color C_NAVY   = new Color(18,  49,  46);   // #12312E
    private static final Color C_TEAL   = new Color(163, 217, 119);  // #A3D977
    private static final Color C_TEXT   = new Color(51,  65,  85);
    private static final Color C_RED    = new Color(239, 68,  68);

    public static byte[] build(BulletinDePaie b) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 54, 36);
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, C_NAVY);
            Font subtitleFont= FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, C_TEAL);
            Font headerFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font normalFont  = FontFactory.getFont(FontFactory.HELVETICA,      10, C_TEXT);
            Font boldFont    = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_NAVY);
            Font smallFont   = FontFactory.getFont(FontFactory.HELVETICA,      8,  Color.GRAY);

            // HEADER
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{50, 50});
            
            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph("SimpleTaff", titleFont));
            leftHeader.addElement(new Paragraph(b.getEntreprise() != null ? b.getEntreprise().getNom() : "Entreprise SA", normalFont));
            headerTable.addCell(leftHeader);
            
            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph titre = new Paragraph("BULLETIN DE PAIE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, C_NAVY));
            titre.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(titre);
            Paragraph periode = new Paragraph("Période: " + b.getPeriode(), subtitleFont);
            periode.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(periode);
            headerTable.addCell(rightHeader);
            
            document.add(headerTable);
            document.add(new Paragraph(" "));
            
            // LIGNE DE SEPARATION
            PdfPTable line = new PdfPTable(1);
            line.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell(new Phrase(" "));
            lineCell.setBorder(Rectangle.TOP);
            lineCell.setBorderColor(C_NAVY);
            lineCell.setBorderWidth(2f);
            line.addCell(lineCell);
            document.add(line);
            
            document.add(new Paragraph(" "));

            // INFO BOXES
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingAfter(20);
            
            PdfPCell agentBox = new PdfPCell();
            agentBox.setPadding(10);
            agentBox.setBorderColor(new Color(226, 232, 240));
            agentBox.setBackgroundColor(new Color(248, 250, 252));
            agentBox.addElement(new Paragraph("INFORMATIONS AGENT", smallFont));
            agentBox.addElement(new Paragraph("Nom : " + b.getAgent().getNom() + " " + b.getAgent().getPrenom(), boldFont));
            agentBox.addElement(new Paragraph("Matricule : " + (b.getAgent().getMatricule() != null ? b.getAgent().getMatricule() : "—"), normalFont));
            String metier = b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null 
                            ? b.getAffectation().getPoste().getEmploi().getLibelle() : "Non défini";
            agentBox.addElement(new Paragraph("Métier : " + metier, normalFont));
            infoTable.addCell(agentBox);
            
            PdfPCell detailBox = new PdfPCell();
            detailBox.setPadding(10);
            detailBox.setBorderColor(new Color(226, 232, 240));
            detailBox.setBackgroundColor(new Color(248, 250, 252));
            detailBox.addElement(new Paragraph("DÉTAILS PAIE", smallFont));
            detailBox.addElement(new Paragraph("Salaire de Base Mensuel : " + (b.getSalaireDeBase() != null ? b.getSalaireDeBase() : "0") + " FCFA", boldFont));
            detailBox.addElement(new Paragraph("Jours Travaillés / Prévus : " + b.getJoursValides() + " / " + b.getJoursPrevus(), normalFont));
            detailBox.addElement(new Paragraph("Paiement : Virement", normalFont));
            infoTable.addCell(detailBox);

            document.add(infoTable);

            // TABLE DES RUBRIQUES
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{40, 20, 20, 20});
            
            addCell(table, "Désignation", headerFont, C_NAVY, true);
            addCell(table, "Base / Taux", headerFont, C_NAVY, true);
            addCell(table, "Gains (+)", headerFont, C_NAVY, true);
            addCell(table, "Retenues (-)", headerFont, C_NAVY, true);
            
            // Salaire brut
            addCell(table, "Salaire Brut", normalFont, null, false);
            addCell(table, "Mois", normalFont, null, false);
            addCell(table, b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif().toString() : "0", boldFont, null, true);
            addCell(table, "—", normalFont, null, true);
            
            // Primes
            if (b.getTotalPrimes() != null && b.getTotalPrimes().compareTo(BigDecimal.ZERO) > 0) {
                addCell(table, "Primes & Avantages", normalFont, null, false);
                addCell(table, "Forfaitaire", normalFont, null, false);
                addCell(table, b.getTotalPrimes().toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_TEAL), null, true);
                addCell(table, "—", normalFont, null, true);
            }

            // Absences
            if (b.getRetenueAbsence() != null && b.getRetenueAbsence().compareTo(BigDecimal.ZERO) > 0) {
                addCell(table, "Absences Non Justifiées", normalFont, null, false);
                addCell(table, b.getJoursAbsenceNonJustifiee() + " Jours", normalFont, null, false);
                addCell(table, "—", normalFont, null, true);
                addCell(table, b.getRetenueAbsence().toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_RED), null, true);
            }
            
            // CNPS
            if (b.getCotisationCnps() != null && b.getCotisationCnps().compareTo(BigDecimal.ZERO) > 0) {
                addCell(table, "Cotisation CNPS", normalFont, null, false);
                addCell(table, "Taux Légal", normalFont, null, false);
                addCell(table, "—", normalFont, null, true);
                addCell(table, b.getCotisationCnps().toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_RED), null, true);
            }
            
            // CNAM
            if (b.getCotisationCnam() != null && b.getCotisationCnam().compareTo(BigDecimal.ZERO) > 0) {
                addCell(table, "Cotisation CNAM", normalFont, null, false);
                addCell(table, "Taux Légal", normalFont, null, false);
                addCell(table, "—", normalFont, null, true);
                addCell(table, b.getCotisationCnam().toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_RED), null, true);
            }

            document.add(table);
            document.add(new Paragraph(" "));

            // TOTAUX
            PdfPTable totalTable = new PdfPTable(3);
            totalTable.setWidthPercentage(100);
            totalTable.setWidths(new float[]{60, 20, 20});
            
            addCell(totalTable, "TOTAL", boldFont, new Color(241, 245, 249), false);
            
            BigDecimal gains = (b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif() : BigDecimal.ZERO)
                    .add(b.getTotalPrimes() != null ? b.getTotalPrimes() : BigDecimal.ZERO);
            addCell(totalTable, gains.toString(), boldFont, new Color(241, 245, 249), true);
            
            BigDecimal retenues = (b.getRetenueAbsence() != null ? b.getRetenueAbsence() : BigDecimal.ZERO)
                    .add(b.getCotisationCnps() != null ? b.getCotisationCnps() : BigDecimal.ZERO)
                    .add(b.getCotisationCnam() != null ? b.getCotisationCnam() : BigDecimal.ZERO);
            addCell(totalTable, retenues.toString(), boldFont, new Color(241, 245, 249), true);
            
            document.add(totalTable);
            document.add(new Paragraph(" "));
            
            // NET A PAYER
            PdfPTable netTable = new PdfPTable(2);
            netTable.setWidthPercentage(100);
            netTable.setWidths(new float[]{60, 40});
            
            PdfPCell netLabel = new PdfPCell(new Phrase("NET À PAYER", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.WHITE)));
            netLabel.setBackgroundColor(C_NAVY);
            netLabel.setPadding(10);
            netLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
            netTable.addCell(netLabel);
            
            PdfPCell netValue = new PdfPCell(new Phrase((b.getSalaireNetCalcule() != null ? b.getSalaireNetCalcule() : "0") + " FCFA", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, C_NAVY)));
            netValue.setBackgroundColor(new Color(234, 244, 227)); // light teal #EAF4E3
            netValue.setPadding(10);
            netValue.setHorizontalAlignment(Element.ALIGN_CENTER);
            netTable.addCell(netValue);
            
            document.add(netTable);
            
            // FOOTER
            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph("SimpleTaff Platform - Généré automatiquement le " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return new byte[0];
        }
    }

    private static void addCell(PdfPTable table, String text, Font font, Color bg, boolean alignRight) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        if (bg != null) cell.setBackgroundColor(bg);
        cell.setPadding(6);
        cell.setBorderColor(new Color(226, 232, 240));
        if (alignRight) cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(cell);
    }
}
