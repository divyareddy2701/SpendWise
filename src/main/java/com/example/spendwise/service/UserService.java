package com.example.spendwise.service;

import com.example.spendwise.dto.AuthRequest;
import com.example.spendwise.dto.AuthResponse;
import com.example.spendwise.exception.BadRequestException;
import com.example.spendwise.exception.UnauthorizedException;
import com.example.spendwise.model.User;
import com.example.spendwise.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    @Autowired private UserRepository  repo;
    @Autowired private PasswordEncoder encoder;

    public AuthResponse register(AuthRequest req) {

        if (req.getUsername() == null || req.getUsername().trim().length() < 3)
            throw new BadRequestException("Username must be at least 3 characters");

        if (req.getPassword() == null || req.getPassword().length() < 4)
            throw new BadRequestException("Password must be at least 4 characters");

        if (repo.existsByUsername(req.getUsername().trim()))
            throw new BadRequestException("Username already taken");

        User u = new User();
        u.setUsername(req.getUsername().trim());
        u.setPassword(encoder.encode(req.getPassword()));

        User saved = repo.save(u);
        return new AuthResponse(saved.getId(), saved.getUsername(), "Account created!");
    }

    public AuthResponse login(AuthRequest req) {

        User u = repo.findByUsername(req.getUsername())
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password"));

        if (!encoder.matches(req.getPassword(), u.getPassword()))
            throw new UnauthorizedException("Invalid username or password");

        return new AuthResponse(u.getId(), u.getUsername(), "Login successful");
    }
}