package com.siege.platform.rapport;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
public class RapportPdfBuilder {

    // ── Colors ────────────────────────────────────────────────────────────────
    private static final Color C_NAVY   = new Color(18,  49,  46);   // #12312E
    private static final Color C_BLUE   = new Color(18,  49,  46);   // #12312E
    private static final Color C_TEAL   = new Color(163, 217, 119);  // #A3D977
    private static final Color C_AMBER  = new Color(146, 64,  14);
    private static final Color C_RED    = new Color(127, 29,  29);
    private static final Color C_SILVER = new Color(248, 250, 252);
    private static final Color C_BORDER = new Color(226, 232, 240);
    private static final Color C_WHITE  = Color.WHITE;
    private static final Color C_ALT    = new Color(241, 245, 249);
    private static final Color C_LGRAY  = new Color(235, 235, 235);
    private static final Color C_LBLUE  = new Color(234, 244, 227);  // Light green tint
    private static final Color C_TOTROW = new Color(163, 217, 119);

    // ── Fonts ─────────────────────────────────────────────────────────────────
    private static Font fTitle()   { return FontFactory.getFont(FontFactory.HELVETICA_BOLD,   18, C_WHITE); }
    private static Font fSub()     { return FontFactory.getFont(FontFactory.HELVETICA,         10, new Color(186, 230, 253)); }
    private static Font fSect()    { return FontFactory.getFont(FontFactory.HELVETICA_BOLD,   11, C_WHITE); }
    private static Font fKpiVal()  { return FontFactory.getFont(FontFactory.HELVETICA_BOLD,   14, C_NAVY); }
    private static Font fKpiLbl()  { return FontFactory.getFont(FontFactory.HELVETICA,         8, new Color(100, 116, 139)); }
    private static Font fHead()    { return FontFactory.getFont(FontFactory.HELVETICA_BOLD,    8, C_WHITE); }
    private static Font fCell()    { return FontFactory.getFont(FontFactory.HELVETICA,         8, C_NAVY); }
    private static Font fCellB()   { return FontFactory.getFont(FontFactory.HELVETICA_BOLD,    8, C_NAVY); }
    private static Font fNote()    { return FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8, new Color(100, 116, 139)); }
    private static Font fBrand()   { return FontFactory.getFont(FontFactory.HELVETICA_BOLD,    9, new Color(99, 102, 241)); }

    // =========================================================================
    //  PUBLIC ENTRY POINT
    // =========================================================================
    public static byte[] build(Map<String, Object> report, String mois) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 36, 36, 36, 50);
            PdfWriter writer = PdfWriter.getInstance(doc, baos);
            writer.setPageEvent(new FooterEvent());
            doc.open();

            String titre   = str(report.get("titre"),          "RAPPORT OPÉRATIONNEL");
            String period  = str(report.get("period"),         mois);
            String dateGen = str(report.get("dateGeneration"), LocalDate.now().toString());

            addCover(doc, titre, period, dateGen);

            int s = 1;
            if (report.containsKey("presences"))
                s = addPresences(doc, (Map<String, Object>) report.get("presences"), s, mois);
            if (report.containsKey("conges"))
                s = addConges(doc, (Map<String, Object>) report.get("conges"), s);
            if (report.containsKey("materiels"))
                s = addMateriels(doc, (Map<String, Object>) report.get("materiels"), s);
            if (report.containsKey("disciplinaire"))
                s = addDisciplinaire(doc, (Map<String, Object>) report.get("disciplinaire"), s);
            if (report.containsKey("paie"))
                s = addPaie(doc, (Map<String, Object>) report.get("paie"), s);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return ("ERREUR PDF: " + e.getMessage()).getBytes(java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    // =========================================================================
    //  COVER BANNER
    // =========================================================================
    private static void addCover(Document doc, String titre, String period, String dateGen) throws Exception {
        PdfPTable banner = new PdfPTable(1);
        banner.setWidthPercentage(100);
        banner.setSpacingAfter(16);
        PdfPCell bc = new PdfPCell();
        bc.setBackgroundColor(C_NAVY);
        bc.setPadding(20);
        bc.setBorder(Rectangle.NO_BORDER);
        Paragraph p = new Paragraph();
        p.add(new Chunk("SimpleTaff Platform\n", fBrand()));
        p.add(new Chunk(titre + "\n", fTitle()));
        p.add(new Chunk("Période : " + period + "   |   Généré le : " + dateGen, fSub()));
        p.setAlignment(Element.ALIGN_CENTER);
        bc.addElement(p);
        banner.addCell(bc);
        doc.add(banner);
    }

    // =========================================================================
    //  SECTION 1 — PRÉSENCES (tableau mensuel par agent, identique onglet Présences)
    // =========================================================================
    private static int addPresences(Document doc, Map<String, Object> sec, int num, String mois) throws Exception {
        addSectionHeader(doc, num, "PRÉSENCES & POINTAGES — TABLEAU MENSUEL " + mois, C_BLUE);
        addKpiRow(doc, new String[][]{
            {str(sec.get("nombre_entrees"),    "0"), "Pointages enregistrés"},
            {str(sec.get("journees_presentes"), "0"), "Journées de présence distinctes"}
        });

        List<Map<String, Object>> list =
            (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());

        if (list.isEmpty()) {
            addOneColEmpty(doc);
            return num + 1;
        }

        // Parse month range
        YearMonth ym = YearMonth.parse(mois);
        LocalDate firstDay = ym.atDay(1);
        LocalDate lastDay  = ym.atEndOfMonth();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM");
        String[] dayNames = {"Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"};

        // Group pointages by agent name
        java.util.LinkedHashMap<String, List<Map<String, Object>>> byAgent = new java.util.LinkedHashMap<>();
        for (Map<String, Object> p : list) {
            String agent = str(p.get("agentNom"), "Agent Inconnu");
            byAgent.computeIfAbsent(agent, k -> new java.util.ArrayList<>()).add(p);
        }

        boolean firstAgent = true;
        for (Map.Entry<String, List<Map<String, Object>>> entry : byAgent.entrySet()) {
            String agentName   = entry.getKey();
            List<Map<String, Object>> agentRows = entry.getValue();

            // Build date → pointage map
            java.util.HashMap<LocalDate, Map<String, Object>> dayMap = new java.util.HashMap<>();
            for (Map<String, Object> p : agentRows) {
                String ds = str(p.get("date"), "");
                if (!ds.isEmpty()) {
                    try { dayMap.put(LocalDate.parse(ds), p); } catch (Exception ignored) {}
                }
            }

            if (!firstAgent) doc.add(new Paragraph(" "));
            firstAgent = false;

            // Agent sub-header
            PdfPTable ah = new PdfPTable(1);
            ah.setWidthPercentage(100);
            ah.setSpacingBefore(8);
            ah.setSpacingAfter(3);
            PdfPCell ahc = new PdfPCell(new Phrase(
                "Agent : " + agentName + "    |    Période : " + mois, fCellB()));
            ahc.setBackgroundColor(C_LBLUE);
            ahc.setPadding(6);
            ahc.setBorderColor(C_BLUE);
            ah.addCell(ahc);
            doc.add(ah);

            // Timesheet table — 7 cols (same as exportPresencesToPdf)
            PdfPTable t = new PdfPTable(new float[]{14, 12, 12, 16, 18, 18, 10});
            t.setWidthPercentage(100);
            t.setSpacingAfter(4);
            addHeaderRow(t, C_BLUE, "Jour", "Entrée", "Sortie", "Présence", "Site de travail", "Employeur (Pointage)", "Retard");

            long totalMins = 0;
            int  totalRet  = 0;
            int  totalPres = 0;

            for (LocalDate day = firstDay; !day.isAfter(lastDay); day = day.plusDays(1)) {
                int d = day.getDayOfWeek().getValue() - 1; // 0=Lun
                boolean weekend = (d >= 5);
                Color rowBg = weekend ? C_LGRAY : C_WHITE;

                Map<String, Object> p = dayMap.get(day);

                String dayLabel = dayNames[d] + " " + day.format(dateFmt);
                String entree   = "—", sortie = "—", presence = "Absent";
                String site     = "—", employeur = "—", retard = "—";

                if (p != null) {
                    entree    = str(p.get("heureArrivee"), "—");
                    sortie    = str(p.get("heureDepart"),  "—");
                    site      = str(p.get("siteTravail"),  "—");
                    employeur = str(p.get("employeur"),    "—");
                    long mins = p.get("dureeMinutes") instanceof Number
                        ? ((Number) p.get("dureeMinutes")).longValue() : 0L;
                    totalMins += mins;
                    presence  = sortie.equals("—") ? "En cours" : "Complet";
                    totalPres++;
                    if (Boolean.TRUE.equals(p.get("retard"))) { retard = "RETARD"; totalRet++; }
                }

                // Day cell
                PdfPCell dc = new PdfPCell(new Phrase(dayLabel, fCell()));
                dc.setBackgroundColor(rowBg);
                dc.setPadding(4);
                dc.setHorizontalAlignment(Element.ALIGN_CENTER);
                dc.setVerticalAlignment(Element.ALIGN_MIDDLE);
                t.addCell(dc);

                addPC(t, entree,    fCell(), rowBg, true);
                addPC(t, sortie,    fCell(), rowBg, true);
                addPC(t, presence,  fCell(), rowBg, true);
                addPC(t, site,      fCell(), rowBg, false);
                addPC(t, employeur, fCell(), rowBg, false);
                Font rf = "RETARD".equals(retard)
                    ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, Color.RED) : fCell();
                addPC(t, retard, rf, rowBg, true);
            }

            // TOTAUX row
            PdfPCell totLbl = new PdfPCell(new Phrase("TOTAUX", fCellB()));
            totLbl.setColspan(3);
            totLbl.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totLbl.setPadding(4);
            totLbl.setBackgroundColor(C_TOTROW);
            t.addCell(totLbl);
            String hStr = String.format("%dh%02d", totalMins / 60, totalMins % 60);
            addPC(t, totalPres + " prés.",        fCellB(), C_TOTROW, true);
            addPC(t, "Heures: " + hStr,           fCellB(), C_TOTROW, false);
            addPC(t, "—",                         fCell(),  C_TOTROW, false);
            addPC(t, totalRet + " retard(s)",      fCellB(), C_TOTROW, true);

            t.setSpacingAfter(8);
            doc.add(t);
        }

        return num + 1;
    }

    // =========================================================================
    //  SECTION 2 — CONGÉS
    // =========================================================================
    private static int addConges(Document doc, Map<String, Object> sec, int num) throws Exception {
        addSectionHeader(doc, num, "CONGÉS & ABSENCES", C_TEAL);
        addKpiRow(doc, new String[][]{
            {str(sec.get("total_demandes"), "0"), "Demandes totales"},
            {str(sec.get("approuves"),      "0"), "Approuvées"},
            {str(sec.get("en_attente"),     "0"), "En attente"},
            {str(sec.get("refuses"),        "0"), "Refusées"}
        });

        List<Map<String, Object>> list =
            (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
        PdfPTable t = new PdfPTable(new float[]{28, 18, 14, 14, 10, 16});
        t.setWidthPercentage(100);
        t.setSpacingAfter(12);
        addHeaderRow(t, C_TEAL, "Agent", "Type de Congé", "Début", "Fin", "Jours", "Statut");

        boolean alt = false;
        for (Map<String, Object> c : list) {
            addRow(t, alt ? C_ALT : C_WHITE, false,
                str(c.get("agent"),  "—"), str(c.get("type"), "CONGÉ"),
                str(c.get("debut"),  "—"), str(c.get("fin"),  "—"),
                str(c.get("jours"),  "0"), str(c.get("statut"), "—"));
            alt = !alt;
        }
        if (list.isEmpty()) addEmptyRow(t, 6);
        doc.add(t);
        return num + 1;
    }

    // =========================================================================
    //  SECTION 3 — MATÉRIELS
    // =========================================================================
    private static int addMateriels(Document doc, Map<String, Object> sec, int num) throws Exception {
        addSectionHeader(doc, num, "PARC MATÉRIEL & ÉQUIPEMENTS", C_AMBER);
        addKpiRow(doc, new String[][]{
            {str(sec.get("total_equipements"),      "0"), "Total équipements"},
            {str(sec.get("disponibles"),            "0"), "Disponibles"},
            {str(sec.get("assignes"),               "0"), "Assignés"},
            {str(sec.get("en_panne"),               "0"), "En panne"},
            {str(sec.get("perdu_ou_inutilisable"),  "0"), "Perdus / HS"}
        });

        List<Map<String, Object>> list =
            (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
        PdfPTable t = new PdfPTable(new float[]{30, 20, 22, 15, 13});
        t.setWidthPercentage(100);
        t.setSpacingAfter(12);
        addHeaderRow(t, C_AMBER, "Libellé", "Catégorie", "N° Série", "Valeur (FCFA)", "Statut");

        boolean alt = false;
        for (Map<String, Object> m : list) {
            addRow(t, alt ? C_ALT : C_WHITE, false,
                str(m.get("libelle"),       "—"), str(m.get("categorie"),    "—"),
                str(m.get("numero_serie"), "N/A"), str(m.get("valeur"),       "0"),
                str(m.get("statut"),        "—"));
            alt = !alt;
        }
        if (list.isEmpty()) addEmptyRow(t, 5);
        doc.add(t);
        return num + 1;
    }

    // =========================================================================
    //  SECTION 4 — DISCIPLINAIRE
    // =========================================================================
    private static int addDisciplinaire(Document doc, Map<String, Object> sec, int num) throws Exception {
        addSectionHeader(doc, num, "DISCIPLINAIRE & SANCTIONS", C_RED);
        addKpiRow(doc, new String[][]{
            {str(sec.get("total_sanctions"), "0"), "Sanctions / Avertissements du mois"}
        });

        List<Map<String, Object>> list =
            (List<Map<String, Object>>) sec.getOrDefault("liste", Collections.emptyList());
        PdfPTable t = new PdfPTable(new float[]{26, 20, 30, 14, 10});
        t.setWidthPercentage(100);
        t.setSpacingAfter(12);
        addHeaderRow(t, C_RED, "Agent", "Type de Sanction", "Motif", "Date", "Statut");

        boolean alt = false;
        for (Map<String, Object> s : list) {
            addRow(t, alt ? C_ALT : C_WHITE, false,
                str(s.get("agent"),  "—"), str(s.get("type"), "AVERTISSEMENT"),
                str(s.get("motif"),  "—"), str(s.get("date"), "—"),
                str(s.get("statut"), "—"));
            alt = !alt;
        }
        if (list.isEmpty()) addEmptyRow(t, 5);
        doc.add(t);
        return num + 1;
    }



    // =========================================================================
    //  SHARED HELPERS
    // =========================================================================
    private static void addSectionHeader(Document doc, int num, String label, Color color) throws Exception {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingBefore(10);
        t.setSpacingAfter(6);
        PdfPCell c = new PdfPCell(new Phrase(num + ". " + label, fSect()));
        c.setBackgroundColor(color);
        c.setPadding(7);
        c.setBorder(Rectangle.NO_BORDER);
        t.addCell(c);
        doc.add(t);
    }

    private static void addKpiRow(Document doc, String[][] kpis) throws Exception {
        PdfPTable t = new PdfPTable(kpis.length);
        t.setWidthPercentage(100);
        t.setSpacingAfter(8);
        for (String[] k : kpis) {
            PdfPCell c = new PdfPCell();
            c.setBackgroundColor(C_SILVER);
            c.setPadding(8);
            c.setBorderColor(C_BORDER);
            Paragraph p = new Paragraph();
            p.add(new Chunk(k[0] + "\n", fKpiVal()));
            p.add(new Chunk(k[1], fKpiLbl()));
            p.setAlignment(Element.ALIGN_CENTER);
            c.addElement(p);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            t.addCell(c);
        }
        doc.add(t);
    }

    private static void addHeaderRow(PdfPTable t, Color bg, String... cols) {
        for (String col : cols) {
            PdfPCell c = new PdfPCell(new Phrase(col, fHead()));
            c.setBackgroundColor(bg);
            c.setPadding(5);
            c.setBorderColor(C_BORDER);
            c.setHorizontalAlignment(Element.ALIGN_CENTER);
            c.setVerticalAlignment(Element.ALIGN_MIDDLE);
            t.addCell(c);
        }
    }

    private static void addRow(PdfPTable t, Color bg, boolean bold, String... vals) {
        Font f = bold ? fCellB() : fCell();
        for (String v : vals) {
            PdfPCell c = new PdfPCell(new Phrase(v != null ? v : "—", f));
            if (bg != null) c.setBackgroundColor(bg);
            c.setPadding(4);
            c.setBorderColor(C_BORDER);
            t.addCell(c);
        }
    }

    /** Presence cell helper (addPC = addPresenceCell) */
    private static void addPC(PdfPTable t, String text, Font f, Color bg, boolean centered) {
        PdfPCell c = new PdfPCell(new Phrase(text != null ? text : "—", f));
        c.setPadding(4);
        if (bg != null) c.setBackgroundColor(bg);
        c.setBorderColor(C_BORDER);
        c.setVerticalAlignment(Element.ALIGN_MIDDLE);
        c.setHorizontalAlignment(centered ? Element.ALIGN_CENTER : Element.ALIGN_LEFT);
        t.addCell(c);
    }

    private static void addEmptyRow(PdfPTable t, int cols) {
        PdfPCell c = new PdfPCell(new Phrase("Aucune donnée pour cette période.", fNote()));
        c.setColspan(cols);
        c.setPadding(8);
        c.setHorizontalAlignment(Element.ALIGN_CENTER);
        c.setBorderColor(C_BORDER);
        t.addCell(c);
    }

    private static void addOneColEmpty(Document doc) throws Exception {
        PdfPTable t = new PdfPTable(1);
        t.setWidthPercentage(100);
        t.setSpacingAfter(12);
        addEmptyRow(t, 1);
        doc.add(t);
    }

    private static String str(Object val, String def) {
        if (val == null) return def;
        String s = val.toString().trim();
        return s.isEmpty() ? def : s;
    }

    // =========================================================================
    //  SECTION 5: PAIE
    // =========================================================================
    private static int addPaie(Document doc, Map<String, Object> data, int secNum) throws Exception {
        addSectionHeader(doc, secNum, "PAIE ET RÉMUNÉRATIONS", C_NAVY);

        java.math.BigDecimal masse = (java.math.BigDecimal) data.get("total_masse_salariale");
        String masseStr = (masse != null ? masse.toString() : "0") + " FCFA";
        addKpiRow(doc, new String[][]{
            {str(data.get("total_bulletins"), "0"), "Bulletins émis"},
            {masseStr, "Masse Salariale Nette"}
        });

        List<Map<String, Object>> list = (List<Map<String, Object>>) data.get("liste");
        if (list == null || list.isEmpty()) {
            addOneColEmpty(doc);
            return secNum + 1;
        }

        PdfPTable t = new PdfPTable(4);
        t.setWidthPercentage(100);
        t.setWidths(new float[]{25, 25, 25, 25});
        t.setSpacingAfter(20);

        addHeaderRow(t, C_NAVY, "Agent", "Métier", "Brut Effectif", "Net Calculé");

        for (Map<String, Object> r : list) {
            addRow(t, null, false,
                str(r.get("agent"), "—"),
                str(r.get("metier"), "—"),
                str(r.get("brut"), "0") + " FCFA");

            PdfPCell c = new PdfPCell(new Phrase(str(r.get("net"), "0") + " FCFA", fCellB()));
            c.setPadding(4);
            c.setBorderColor(C_BORDER);
            c.setBackgroundColor(C_LBLUE);
            c.setHorizontalAlignment(Element.ALIGN_RIGHT);
            t.addCell(c);
        }
        doc.add(t);
        return secNum + 1;
    }

    // =========================================================================
    //  PAGE FOOTER
    // =========================================================================
    static class FooterEvent extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document doc) {
            try {
                PdfContentByte cb = writer.getDirectContent();
                BaseFont bf = BaseFont.createFont(BaseFont.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED);
                cb.setColorFill(new Color(148, 163, 184));
                cb.setFontAndSize(bf, 7);
                cb.beginText();
                cb.showTextAligned(Element.ALIGN_CENTER,
                    "SimpleTaff Platform  |  Document confidentiel  |  Page " + writer.getPageNumber(),
                    (doc.left() + doc.right()) / 2, doc.bottom() - 15, 0);
                cb.endText();
            } catch (Exception ignored) {}
        }
    }
}
