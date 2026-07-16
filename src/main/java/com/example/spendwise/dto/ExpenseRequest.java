package com.example.spendwise.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public class ExpenseRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 150, message = "Title too long")
    private String title;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private Double amount;

    @NotBlank(message = "Category is required")
    private String category;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private boolean recurring;

    @NotNull(message = "userId is required")
    private Long userId;

    public String    getTitle()     { return title; }
    public void      setTitle(String title)     { this.title = title; }

    public Double    getAmount()    { return amount; }
    public void      setAmount(Double amount)   { this.amount = amount; }

    public String    getCategory()  { return category; }
    public void      setCategory(String category) { this.category = category; }

    public LocalDate getDate()      { return date; }
    public void      setDate(LocalDate date)    { this.date = date; }

    public boolean   isRecurring()  { return recurring; }
    public void      setRecurring(boolean recurring) { this.recurring = recurring; }

    public Long      getUserId()    { return userId; }
    public void      setUserId(Long userId)     { this.userId = userId; }
}