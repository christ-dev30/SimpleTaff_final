import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;

public class CheckDb {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://localhost:5432/simpletaff_db";
        String user = "postgres";
        String password = "@Juniorehui15";
        
        try (Connection conn = DriverManager.getConnection(url, user, password)) {
            if (args.length > 0 && args[0].equals("-query")) {
                String query = args[1];
                System.out.println("Running query: " + query);
                try (Statement stmt = conn.createStatement();
                     ResultSet rs = stmt.executeQuery(query)) {
                    ResultSetMetaData meta = rs.getMetaData();
                    int cols = meta.getColumnCount();
                    for (int i = 1; i <= cols; i++) {
                        System.out.print(meta.getColumnLabel(i) + "\t");
                    }
                    System.out.println();
                    int count = 0;
                    while (rs.next()) {
                        count++;
                        for (int i = 1; i <= cols; i++) {
                            System.out.print(rs.getObject(i) + "\t");
                        }
                        System.out.println();
                    }
                    System.out.println("Rows: " + count);
                }
                return;
            } else if (args.length > 0 && args[0].equals("-update")) {
                String updateSql = args[1];
                System.out.println("Running update: " + updateSql);
                try (Statement stmt = conn.createStatement()) {
                    int rows = stmt.executeUpdate(updateSql);
                    System.out.println("Update successful. Rows affected: " + rows);
                }
                return;
            }
            
            System.out.println("Connection successful!");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
