package com.example.spendwise.controller;

import com.example.spendwise.dto.ApiResponse;
import com.example.spendwise.dto.AuthRequest;
import com.example.spendwise.dto.AuthResponse;
import com.example.spendwise.service.UserService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired private UserService service;

    // ── POST /api/users/register ──────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody AuthRequest req) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registered!", service.register(req)));
    }

    // ── POST /api/users/login ─────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody AuthRequest req) {
        return ResponseEntity.ok(
                ApiResponse.ok("Login successful", service.login(req)));
    }
}