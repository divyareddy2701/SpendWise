package com.example.spendwise.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "expenses")
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private double amount;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private boolean recurring;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Long          getId()        { return id; }
    public void          setId(Long id) { this.id = id; }

    public String        getTitle()     { return title; }
    public void          setTitle(String title) { this.title = title; }

    public String        getCategory()  { return category; }
    public void          setCategory(String category) { this.category = category; }

    public double        getAmount()    { return amount; }
    public void          setAmount(double amount) { this.amount = amount; }

    public LocalDate     getDate()      { return date; }
    public void          setDate(LocalDate date) { this.date = date; }

    public boolean       isRecurring()  { return recurring; }
    public void          setRecurring(boolean recurring) { this.recurring = recurring; }

    public Long          getUserId()    { return userId; }
    public void          setUserId(Long userId) { this.userId = userId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void          setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}