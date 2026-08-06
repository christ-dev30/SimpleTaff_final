import java.sql.*;

public class QueryUsers {
    public static void main(String[] args) {
        String url = "jdbc:mysql://94.130.65.236:3306/ehuicp_simpletaff?useSSL=false&allowPublicKeyRetrieval=true";
        String user = "ehuicp_ehuicp";
        String pass = "cG6b-Q?,y6]@bb+T";

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("--- Utilisateurs ---");
            ResultSet rs = stmt.executeQuery("SELECT nom, prenom, email, dtype FROM utilisateur");
            while (rs.next()) {
                System.out.println(rs.getString("dtype") + ": " + rs.getString("nom") + " " + rs.getString("prenom") + " (" + rs.getString("email") + ")");
            }

            System.out.println("\n--- Agents Terrain ---");
            ResultSet rs2 = stmt.executeQuery("SELECT nom, prenom, matricule, email FROM agent_terrain");
            while (rs2.next()) {
                System.out.println("AGENT: " + rs2.getString("matricule") + " - " + rs2.getString("nom") + " " + rs2.getString("prenom") + " (" + rs2.getString("email") + ")");
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
