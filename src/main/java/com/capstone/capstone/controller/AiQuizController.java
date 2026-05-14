package com.capstone.capstone.controller;

import com.capstone.capstone.dto.AiQuizRequest;
import com.capstone.capstone.dto.AiQuizResponse;
import com.capstone.capstone.service.AiQuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AiQuizController {

    private final AiQuizService aiQuizService;

    @PostMapping("/quiz")
    public ResponseEntity<AiQuizResponse> generateQuiz(@RequestBody AiQuizRequest request) {
        return ResponseEntity.ok(aiQuizService.generateQuiz(request));
    }
}
