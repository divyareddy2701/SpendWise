package com.example.spendwise.repository;

import com.example.spendwise.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByUserIdOrderByDateDesc(Long userId);

    List<Expense> findByUserIdAndDateBetweenOrderByDateDesc(
            Long userId, LocalDate from, LocalDate to);

    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.userId = :userId")
    Double sumAmountByUserId(@Param("userId") Long userId);
}