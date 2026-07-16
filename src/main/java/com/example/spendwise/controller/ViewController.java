package com.example.spendwise.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ViewController {

    @GetMapping("/")
    public String home() {
        // Redirects to static login.html in resources/static/
        return "redirect:/login.html";
    }
}

