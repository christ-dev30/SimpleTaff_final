package com.siege.platform.paie;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

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

    public static byte[] build(BulletinDePaie b) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 40, 40, 50, 40);
            PdfWriter writer = PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, C_NAVY);
            Font subtitleFont  = FontFactory.getFont(FontFactory.HELVETICA, 10, C_TEXT);
            Font docTitleFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, C_NAVY);
            Font periodeFont   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, C_GREEN);
            
            Font boxTitleFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, new Color(140, 150, 160));
            Font labelFont     = FontFactory.getFont(FontFactory.HELVETICA, 9, C_TEXT);
            Font valueFont     = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_BLACK);
            Font blueValueFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_BLUE);
            
            Font tableHeadFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
            Font tableCellFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_TEXT);
            Font tableCellVal  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_BLACK);

            Font summaryLabel  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, C_NAVY);
            Font summaryValG   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_NAVY);
            Font summaryValR   = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, C_RED);
            Font netLabelFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, C_NAVY);
            Font netValueFont  = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, C_NAVY);
            
            Font footerFont    = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(170, 180, 190));

            // ---------------- HEADER ----------------
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{50, 50});
            
            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(Rectangle.NO_BORDER);
            leftHeader.addElement(new Paragraph("SimpleTaff", titleFont));
            leftHeader.addElement(new Paragraph(b.getEntreprise() != null ? b.getEntreprise().getNom() : "SimpleTaff Entreprise", subtitleFont));
            headerTable.addCell(leftHeader);
            
            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(Rectangle.NO_BORDER);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph titre = new Paragraph("BULLETIN DE PAIE", docTitleFont);
            titre.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(titre);
            Paragraph periode = new Paragraph("Période: " + b.getPeriode(), periodeFont);
            periode.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(periode);
            headerTable.addCell(rightHeader);
            
            document.add(headerTable);
            document.add(new Paragraph(" "));
            document.add(new Paragraph(" "));

            // ---------------- INFO BOXES ----------------
            PdfPTable infoTable = new PdfPTable(3);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{48, 4, 48}); // 4 is a gap
            
            // Left Box
            PdfPCell agentBox = new PdfPCell();
            agentBox.setBorder(Rectangle.NO_BORDER);
            agentBox.setBackgroundColor(C_LIGHT_BG);
            agentBox.setPadding(12);
            
            agentBox.addElement(new Paragraph("INFORMATIONS AGENT", boxTitleFont));
            agentBox.addElement(new Paragraph(" "));
            
            PdfPTable agentDetails = new PdfPTable(2);
            agentDetails.setWidthPercentage(100);
            agentDetails.setWidths(new float[]{30, 70});
            addInfoRow(agentDetails, "Nom :", b.getAgent().getNom() + " " + b.getAgent().getPrenom(), labelFont, valueFont);
            addInfoRow(agentDetails, "Matricule :", b.getAgent().getMatricule() != null ? b.getAgent().getMatricule() : "—", labelFont, valueFont);
            String metier = b.getAffectation() != null && b.getAffectation().getPoste() != null && b.getAffectation().getPoste().getEmploi() != null 
                            ? b.getAffectation().getPoste().getEmploi().getLibelle() : "Non défini";
            addInfoRow(agentDetails, "Métier :", metier, labelFont, blueValueFont);
            agentBox.addElement(agentDetails);
            
            infoTable.addCell(agentBox);
            
            // Gap
            PdfPCell gap = new PdfPCell();
            gap.setBorder(Rectangle.NO_BORDER);
            infoTable.addCell(gap);
            
            // Right Box
            PdfPCell detailBox = new PdfPCell();
            detailBox.setBorder(Rectangle.NO_BORDER);
            detailBox.setBackgroundColor(C_LIGHT_BG);
            detailBox.setPadding(12);
            
            detailBox.addElement(new Paragraph("DÉTAILS PÉRIODE", boxTitleFont));
            detailBox.addElement(new Paragraph(" "));
            
            PdfPTable periodDetails = new PdfPTable(2);
            periodDetails.setWidthPercentage(100);
            periodDetails.setWidths(new float[]{35, 65});
            addInfoRow(periodDetails, "Base\nMensuelle :", formatVal(b.getSalaireDeBase()) + " F CFA", labelFont, valueFont);
            addInfoRow(periodDetails, "Paiement :", "Virement Bancaire", labelFont, blueValueFont);
            detailBox.addElement(periodDetails);
            
            infoTable.addCell(detailBox);

            document.add(infoTable);
            document.add(new Paragraph(" "));
            document.add(new Paragraph(" "));

            // ---------------- TABLE ----------------
            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{35, 25, 20, 20});
            
            addHeaderCell(table, "DÉSIGNATION", tableHeadFont, C_NAVY, Element.ALIGN_LEFT);
            addHeaderCell(table, "BASE / TAUX", tableHeadFont, C_NAVY, Element.ALIGN_CENTER);
            addHeaderCell(table, "GAINS (+)", tableHeadFont, C_NAVY, Element.ALIGN_CENTER);
            addHeaderCell(table, "RETENUES (-)", tableHeadFont, C_NAVY, Element.ALIGN_CENTER);
            
            // Salaire brut
            addRow(table, "Salaire Brut", "Mois complet", formatVal(b.getSalaireBrutEffectif()), "-", tableCellFont, tableCellVal);
            
            // Primes
            if (b.getTotalPrimes() != null) {
                addRow(table, "Primes & Avantages", "Forfaitaire", formatVal(b.getTotalPrimes()), "-", tableCellFont, tableCellVal);
            }
            
            // Absences
            addRow(table, "Absences Non Justifiées", "Jours perdus", "-", formatVal(b.getRetenueAbsence()), tableCellFont, tableCellVal);
            
            // CNPS
            if (b.getCotisationCnps() != null) {
                addRow(table, "Cotisation CNPS", "6.3%", "-", formatVal(b.getCotisationCnps()), tableCellFont, tableCellVal);
            }
            
            // CNAM
            if (b.getCotisationCnam() != null) {
                addRow(table, "Cotisation CNAM", "1.0%", "-", formatVal(b.getCotisationCnam()), tableCellFont, tableCellVal);
            }

            document.add(table);
            document.add(new Paragraph(" "));
            document.add(new Paragraph(" "));

            // ---------------- SUMMARY BOX ----------------
            PdfPTable summaryLayout = new PdfPTable(2);
            summaryLayout.setWidthPercentage(100);
            summaryLayout.setWidths(new float[]{45, 55});
            
            PdfPCell emptyLeft = new PdfPCell();
            emptyLeft.setBorder(Rectangle.NO_BORDER);
            summaryLayout.addCell(emptyLeft);
            
            PdfPCell summaryBox = new PdfPCell();
            summaryBox.setBorder(Rectangle.NO_BORDER);
            summaryBox.setBackgroundColor(C_NET_BG);
            summaryBox.setPadding(15);
            
            PdfPTable totalsTable = new PdfPTable(2);
            totalsTable.setWidthPercentage(100);
            totalsTable.setWidths(new float[]{40, 60});
            
            BigDecimal gains = (b.getSalaireBrutEffectif() != null ? b.getSalaireBrutEffectif() : BigDecimal.ZERO)
                    .add(b.getTotalPrimes() != null ? b.getTotalPrimes() : BigDecimal.ZERO);
            BigDecimal retenues = (b.getRetenueAbsence() != null ? b.getRetenueAbsence() : BigDecimal.ZERO)
                    .add(b.getCotisationCnps() != null ? b.getCotisationCnps() : BigDecimal.ZERO)
                    .add(b.getCotisationCnam() != null ? b.getCotisationCnam() : BigDecimal.ZERO);
            
            PdfPCell lbl1 = new PdfPCell(new Phrase("Total Gains", summaryLabel));
            lbl1.setBorder(Rectangle.NO_BORDER); lbl1.setPaddingBottom(10);
            PdfPCell val1 = new PdfPCell(new Phrase(formatMoney(gains) + " F CFA", summaryValG));
            val1.setBorder(Rectangle.NO_BORDER); val1.setHorizontalAlignment(Element.ALIGN_RIGHT); val1.setPaddingBottom(10);
            totalsTable.addCell(lbl1); totalsTable.addCell(val1);
            
            PdfPCell lbl2 = new PdfPCell(new Phrase("Total Retenues", summaryLabel));
            lbl2.setBorder(Rectangle.NO_BORDER); lbl2.setPaddingBottom(12);
            PdfPCell val2 = new PdfPCell(new Phrase(formatMoney(retenues) + " F CFA", summaryValR));
            val2.setBorder(Rectangle.NO_BORDER); val2.setHorizontalAlignment(Element.ALIGN_RIGHT); val2.setPaddingBottom(12);
            totalsTable.addCell(lbl2); totalsTable.addCell(val2);
            
            // Separator inside summary box
            PdfPCell sep = new PdfPCell();
            sep.setColspan(2);
            sep.setBorder(Rectangle.BOTTOM);
            sep.setBorderColor(new Color(200, 220, 190));
            sep.setBorderWidth(1f);
            sep.setPaddingBottom(10);
            totalsTable.addCell(sep);
            
            // Net
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
            document.add(new Paragraph(" "));
            Paragraph p1 = new Paragraph("Pour faire valoir ce que de droit.", footerFont);
            p1.setAlignment(Element.ALIGN_CENTER);
            document.add(p1);
            
            Paragraph p2 = new Paragraph("Généré le " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " par SimpleTaff", footerFont);
            p2.setAlignment(Element.ALIGN_CENTER);
            document.add(p2);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return new byte[0];
        }
    }

    private static String formatVal(BigDecimal val) {
        if (val == null) return "0";
        return String.format(java.util.Locale.US, "%.0f", val);
    }
    
    private static String formatMoney(BigDecimal val) {
        if (val == null) return "0.00";
        return String.format(java.util.Locale.US, "%.2f", val);
    }

    private static void addInfoRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPaddingBottom(8);
        table.addCell(c1);
        
        PdfPCell c2 = new PdfPCell(new Phrase(value, valueFont));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setPaddingBottom(8);
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
        c1.setPaddingTop(12); c1.setPaddingBottom(12); c1.setPaddingLeft(5);
        
        PdfPCell c2 = new PdfPCell(new Phrase(col2, textFont));
        c2.setBorder(Rectangle.BOTTOM); c2.setBorderColor(C_BORDER); c2.setBorderWidth(1f);
        c2.setPaddingTop(12); c2.setPaddingBottom(12); c2.setHorizontalAlignment(Element.ALIGN_CENTER);
        
        PdfPCell c3 = new PdfPCell(new Phrase(col3, valFont));
        c3.setBorder(Rectangle.BOTTOM); c3.setBorderColor(C_BORDER); c3.setBorderWidth(1f);
        c3.setPaddingTop(12); c3.setPaddingBottom(12); c3.setHorizontalAlignment(Element.ALIGN_CENTER);
        
        PdfPCell c4 = new PdfPCell(new Phrase(col4, valFont));
        c4.setBorder(Rectangle.BOTTOM); c4.setBorderColor(C_BORDER); c4.setBorderWidth(1f);
        c4.setPaddingTop(12); c4.setPaddingBottom(12); c4.setHorizontalAlignment(Element.ALIGN_CENTER);
        
        table.addCell(c1);
        table.addCell(c2);
        table.addCell(c3);
        table.addCell(c4);
    }
}
