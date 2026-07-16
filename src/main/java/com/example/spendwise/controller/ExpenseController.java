package com.example.spendwise.controller;

import com.example.spendwise.dto.ApiResponse;
import com.example.spendwise.dto.ExpenseRequest;
import com.example.spendwise.dto.ExpenseResponse;
import com.example.spendwise.service.ExpenseService;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    @Autowired private ExpenseService service;

    // ── POST /api/expenses ────────────────────────────────────
    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(
            @Valid @RequestBody ExpenseRequest req) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Expense added", service.create(req)));
    }

    // ── GET /api/expenses/user/{userId} ───────────────────────
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> getByUser(
            @PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(service.getByUser(userId)));
    }

    // ── PUT /api/expenses/{id} ────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequest req) {
        return ResponseEntity.ok(ApiResponse.ok("Updated", service.update(id, req)));
    }

    // ── DELETE /api/expenses/{id}?userId=X ───────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @RequestParam Long userId) {
        service.delete(id, userId);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    // ── POST /api/expenses/upload/{userId} ────────────────────
    @PostMapping("/upload/{userId}")
    public ResponseEntity<ApiResponse<List<ExpenseResponse>>> upload(
            @RequestParam("file") MultipartFile file,
            @PathVariable Long userId) {
        List<ExpenseResponse> results = service.uploadCSV(file, userId);
        return ResponseEntity.ok(
                ApiResponse.ok("Imported " + results.size() + " expenses", results));
    }
}