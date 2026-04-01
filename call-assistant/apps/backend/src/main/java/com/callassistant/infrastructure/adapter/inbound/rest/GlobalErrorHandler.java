package com.callassistant.infrastructure.adapter.inbound.rest;

import com.callassistant.application.usecase.SessionNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import reactor.core.publisher.Mono;

import java.net.URI;

@RestControllerAdvice
public class GlobalErrorHandler {

    @ExceptionHandler(SessionNotFoundException.class)
    public Mono<ProblemDetail> handleNotFound(SessionNotFoundException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setType(URI.create("urn:callassistant:error:not-found"));
        return Mono.just(problem);
    }

    @ExceptionHandler(IllegalStateException.class)
    public Mono<ProblemDetail> handleIllegalState(IllegalStateException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setType(URI.create("urn:callassistant:error:conflict"));
        return Mono.just(problem);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public Mono<ProblemDetail> handleBadRequest(IllegalArgumentException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setType(URI.create("urn:callassistant:error:bad-request"));
        return Mono.just(problem);
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public Mono<ProblemDetail> handleValidation(WebExchangeBindException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY,
                "Validation failed: " + ex.getMessage());
        problem.setType(URI.create("urn:callassistant:error:validation"));
        return Mono.just(problem);
    }
}
