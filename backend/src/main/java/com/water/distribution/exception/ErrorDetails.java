package com.water.distribution.exception;

import java.time.LocalDateTime;
import java.util.List;

public class ErrorDetails {
    private Boolean success;
    private String message;
    private List<String> errors;
    private LocalDateTime timestamp;

    public ErrorDetails() {}

    public ErrorDetails(Boolean success, String message, List<String> errors, LocalDateTime timestamp) {
        this.success = success;
        this.message = message;
        this.errors = errors;
        this.timestamp = timestamp;
    }

    public Boolean getSuccess() { return success; }
    public void setSuccess(Boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public static ErrorDetailsBuilder builder() { return new ErrorDetailsBuilder(); }

    public static class ErrorDetailsBuilder {
        private Boolean success;
        private String message;
        private List<String> errors;
        private LocalDateTime timestamp;

        public ErrorDetailsBuilder success(Boolean success) { this.success = success; return this; }
        public ErrorDetailsBuilder message(String message) { this.message = message; return this; }
        public ErrorDetailsBuilder errors(List<String> errors) { this.errors = errors; return this; }
        public ErrorDetailsBuilder timestamp(LocalDateTime timestamp) { this.timestamp = timestamp; return this; }

        public ErrorDetails build() {
            return new ErrorDetails(success, message, errors, timestamp);
        }
    }
}
