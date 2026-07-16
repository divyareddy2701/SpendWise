package com.example.spendwise.dto;

public class AuthResponse {

    private Long   id;
    private String username;
    private String message;

    public AuthResponse(Long id, String username, String message) {
        this.id       = id;
        this.username = username;
        this.message  = message;
    }

    public Long   getId()       { return id; }
    public String getUsername() { return username; }
    public String getMessage()  { return message; }
}