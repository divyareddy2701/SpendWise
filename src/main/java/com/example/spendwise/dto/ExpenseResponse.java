package com.example.spendwise.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ExpenseResponse {

    private Long          id;
    private String        title;
    private Double        amount;
    private String        category;
    private LocalDate     date;
    private boolean       recurring;
    private LocalDateTime createdAt;
    private Long          userId;

    public ExpenseResponse(
            Long id,
            String title,
            Double amount,
            String category,
            LocalDate date,
            boolean recurring,
            LocalDateTime createdAt,
            Long userId) {

        this.id        = id;
        this.title     = title;
        this.amount    = amount;
        this.category  = category;
        this.date      = date;
        this.recurring = recurring;
        this.createdAt = createdAt;
        this.userId    = userId;
    }

    public Long          getId()        { return id; }
    public String        getTitle()     { return title; }
    public Double        getAmount()    { return amount; }
    public String        getCategory()  { return category; }
    public LocalDate     getDate()      { return date; }
    public boolean       isRecurring()  { return recurring; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public Long          getUserId()    { return userId; }
}