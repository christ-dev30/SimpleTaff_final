package com.siege.platform.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private UUID id;
    private String email;
    private String role;

    public JwtResponse(String accessToken, UUID id, String email, String role) {
        this.token = accessToken;
        this.id = id;
        this.email = email;
        this.role = role;
    }
}
