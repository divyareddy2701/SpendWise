package com.example.spendwise.dto;

public class ApiResponse<T> {

    private String message;
    private T data;

    public ApiResponse(String message, T data) {
        this.message = message;
        this.data    = data;
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(message, data);
    }

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>("success", data);
    }

    public String getMessage() { return message; }
    public T getData()         { return data; }
}