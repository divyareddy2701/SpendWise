package com.example.spendwise.service;

import com.example.spendwise.dto.ExpenseRequest;
import com.example.spendwise.dto.ExpenseResponse;
import com.example.spendwise.exception.BadRequestException;
import com.example.spendwise.exception.ResourceNotFoundException;
import com.example.spendwise.exception.UnauthorizedException;
import com.example.spendwise.model.Expense;
import com.example.spendwise.repository.ExpenseRepository;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository repo;

    // ── Mapper: Entity → Response ─────────────────────────────
    private ExpenseResponse toResponse(Expense e) {
        return new ExpenseResponse(
                e.getId(),
                e.getTitle(),
                e.getAmount(),
                e.getCategory(),
                e.getDate(),
                e.isRecurring(),
                e.getCreatedAt(),
                e.getUserId()
        );
    }

    // ── Mapper: Request → Entity ──────────────────────────────
    private Expense toEntity(ExpenseRequest req) {
        Expense e = new Expense();
        e.setTitle(req.getTitle().trim());
        e.setAmount(req.getAmount());
        e.setCategory(req.getCategory());
        e.setDate(req.getDate());
        e.setRecurring(req.isRecurring());
        e.setUserId(req.getUserId());
        return e;
    }

    // ── Create ────────────────────────────────────────────────
    public ExpenseResponse create(ExpenseRequest req) {
        return toResponse(repo.save(toEntity(req)));
    }

    // ── Get all by user ───────────────────────────────────────
    public List<ExpenseResponse> getByUser(Long userId) {
        return repo.findByUserIdOrderByDateDesc(userId)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ── Update ────────────────────────────────────────────────
    public ExpenseResponse update(Long id, ExpenseRequest req) {
        Expense e = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (!e.getUserId().equals(req.getUserId())) {
            throw new UnauthorizedException("You can only edit your own expenses");
        }

        e.setTitle(req.getTitle().trim());
        e.setAmount(req.getAmount());
        e.setCategory(req.getCategory());
        e.setDate(req.getDate());
        e.setRecurring(req.isRecurring());

        return toResponse(repo.save(e));
    }

    // ── Delete ────────────────────────────────────────────────
    public void delete(Long id, Long userId) {
        Expense e = repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found with id: " + id));

        if (!e.getUserId().equals(userId)) {
            throw new UnauthorizedException("You can only delete your own expenses");
        }

        repo.delete(e);
    }

    // ── CSV Upload ────────────────────────────────────────────
    public List<ExpenseResponse> uploadCSV(MultipartFile file, Long userId) {

        if (file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".csv")) {
            throw new BadRequestException("Only CSV files are accepted");
        }

        List<Expense> toSave = new ArrayList<>();

        try (
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8));
                CSVParser parser = CSVFormat.DEFAULT
                        .withFirstRecordAsHeader()
                        .withIgnoreHeaderCase()
                        .withTrim()
                        .parse(reader)
        ) {
            int rowNum = 1;
            for (CSVRecord record : parser) {
                rowNum++;
                try {
                    String title    = record.get("title");
                    String amountStr= record.get("amount");
                    String category = record.get("category");
                    String dateStr  = record.get("date");
                    String recStr   = record.get("recurring");

                    if (title == null || title.isBlank()) continue;

                    double amount;
                    try {
                        amount = Double.parseDouble(amountStr.trim());
                    } catch (NumberFormatException ex) {
                        throw new BadRequestException("Row " + rowNum + ": invalid amount '" + amountStr + "'");
                    }

                    LocalDate date;
                    try {
                        date = LocalDate.parse(dateStr.trim());
                    } catch (Exception ex) {
                        throw new BadRequestException("Row " + rowNum + ": invalid date '" + dateStr + "' (use YYYY-MM-DD)");
                    }

                    boolean recurring = "true".equalsIgnoreCase(recStr.trim());

                    // Validate category
                    String cat = normalizeCategory(category.trim());

                    Expense e = new Expense();
                    e.setTitle(title.trim());
                    e.setAmount(amount);
                    e.setCategory(cat);
                    e.setDate(date);
                    e.setRecurring(recurring);
                    e.setUserId(userId);

                    toSave.add(e);

                } catch (BadRequestException ex) {
                    throw ex;
                } catch (Exception ex) {
                    throw new BadRequestException("Row " + rowNum + ": " + ex.getMessage());
                }
            }
        } catch (BadRequestException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BadRequestException("Failed to parse CSV: " + ex.getMessage());
        }

        if (toSave.isEmpty()) {
            throw new BadRequestException("No valid rows found in CSV");
        }

        return repo.saveAll(toSave)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private String normalizeCategory(String raw) {
        return switch (raw.toLowerCase()) {
            case "food"          -> "Food";
            case "transport"     -> "Transport";
            case "shopping"      -> "Shopping";
            case "health"        -> "Health";
            case "utilities"     -> "Utilities";
            case "education"     -> "Education";
            case "entertainment" -> "Entertainment";
            default              -> "Other";
        };
    }
}