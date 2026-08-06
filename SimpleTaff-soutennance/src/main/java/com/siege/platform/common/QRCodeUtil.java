package com.siege.platform.common;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * QR Code Generator with cryptographic signing (JWT/HMAC-SHA256)
 * Ensures QR codes cannot be forged and can be verified server-side
 */
@Component
public class QRCodeUtil {

    @Value("${app.qr.secret:SimpleTaff-QRCode-Secret-Key-Must-Be-At-Least-32-Chars}")
    private String qrSecret;

    @Value("${app.qr.expiration:31536000000}") // 1 year in milliseconds
    private long qrExpiration;

    /**
     * Generate a cryptographically signed QR code for an agent
     * @param agentId UUID of the agent
     * @param agentName Name of the agent
     * @return JWT-signed QR code string
     */
    public String generateQRCode(UUID agentId, String agentName) {
        SecretKey key = Keys.hmacShaKeyFor(qrSecret.getBytes(StandardCharsets.UTF_8));

        Map<String, Object> claims = new HashMap<>();
        claims.put("agentId", agentId.toString());
        claims.put("agentName", agentName);
        claims.put("timestamp", System.currentTimeMillis());
        claims.put("nonce", UUID.randomUUID().toString()); // Prevent replay attacks

        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + qrExpiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Verify and parse a QR code
     * @param qrCode JWT-signed QR code string
     * @return Map of verified claims
     * @throws Exception if signature is invalid or expired
     */
    public Map<String, Object> verifyQRCode(String qrCode) throws Exception {
        SecretKey key = Keys.hmacShaKeyFor(qrSecret.getBytes(StandardCharsets.UTF_8));

        var claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(qrCode)
                .getPayload();


        return new HashMap<>(claims);

    }

    /**
     * Extract agent ID from QR code (without verification - use verifyQRCode for validation)
     * @param qrCode JWT-signed QR code string
     * @return Agent UUID
     */
    public UUID extractAgentId(String qrCode) {
        try {
            Map<String, Object> claims = verifyQRCode(qrCode);
            return UUID.fromString((String) claims.get("agentId"));
        } catch (Exception e) {
            throw new IllegalArgumentException("QR code invalide ou expiré: " + e.getMessage());
        }
    }
}
