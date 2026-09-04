package com.water.distribution.dto;

import java.util.Set;

public class JwtAuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType = "Bearer";
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private Set<String> roles;

    public JwtAuthResponse() {}

    public JwtAuthResponse(String accessToken, String refreshToken, String tokenType, Long id, String username, String email, String fullName, Set<String> roles) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenType = tokenType != null ? tokenType : "Bearer";
        this.id = id;
        this.username = username;
        this.email = email;
        this.fullName = fullName;
        this.roles = roles;
    }

    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public String getTokenType() { return tokenType; }
    public void setTokenType(String tokenType) { this.tokenType = tokenType; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public Set<String> getRoles() { return roles; }
    public void setRoles(Set<String> roles) { this.roles = roles; }

    public static JwtAuthResponseBuilder builder() { return new JwtAuthResponseBuilder(); }

    public static class JwtAuthResponseBuilder {
        private String accessToken;
        private String refreshToken;
        private String tokenType = "Bearer";
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private Set<String> roles;

        public JwtAuthResponseBuilder accessToken(String accessToken) { this.accessToken = accessToken; return this; }
        public JwtAuthResponseBuilder refreshToken(String refreshToken) { this.refreshToken = refreshToken; return this; }
        public JwtAuthResponseBuilder tokenType(String tokenType) { this.tokenType = tokenType; return this; }
        public JwtAuthResponseBuilder id(Long id) { this.id = id; return this; }
        public JwtAuthResponseBuilder username(String username) { this.username = username; return this; }
        public JwtAuthResponseBuilder email(String email) { this.email = email; return this; }
        public JwtAuthResponseBuilder fullName(String fullName) { this.fullName = fullName; return this; }
        public JwtAuthResponseBuilder roles(Set<String> roles) { this.roles = roles; return this; }

        public JwtAuthResponse build() {
            return new JwtAuthResponse(accessToken, refreshToken, tokenType, id, username, email, fullName, roles);
        }
    }
}
