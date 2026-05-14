package com.capstone.capstone.controller;

import com.capstone.capstone.domain.PdfDocument;
import com.capstone.capstone.domain.ReverseLearningLog;
import com.capstone.capstone.domain.StudyMemo;
import com.capstone.capstone.domain.SummaryNote;
import com.capstone.capstone.service.LearningDataService;
import com.capstone.capstone.service.PdfService;
import com.capstone.capstone.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PdfController {

    private final PdfService pdfService;
    private final SummaryService summaryService;
    private final LearningDataService learningDataService;

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<Map<String, Object>> uploadPdf(@RequestPart("file") MultipartFile file) throws IOException {
        String extractedText = pdfService.extractText(file);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("fileName", file.getOriginalFilename());
        response.put("textLength", extractedText.length());
        response.put("text", extractedText);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/summary")
    public ResponseEntity<String> summarize(@RequestBody String text) {
        return ResponseEntity.ok(summaryService.summarize(text));
    }

    @PostMapping("/upload-summary")
    public ResponseEntity<Map<String, Object>> uploadAndSummarize(@RequestParam("file") MultipartFile file) throws Exception {
        String text = pdfService.extractText(file);
        PdfDocument pdf = learningDataService.savePdf(file.getOriginalFilename(), text);
        String summary = summaryService.summarize(text);
        Map<String, Object> quiz = summaryService.generateBlankQuiz(summary);

        String question = (String) quiz.get("question");
        String answer = (String) quiz.get("answer");
        SummaryNote note = learningDataService.saveSummary(pdf.getId(), summary, question, answer);

        Map<String, Object> result = new HashMap<>();
        result.put("pdfId", pdf.getId());
        result.put("summaryId", note.getId());
        result.put("summary", summary);
        result.put("question", question);
        result.put("answer", answer);

        return ResponseEntity.ok(result);
    }

    @PostMapping("/quiz")
    public ResponseEntity<Map<String, Object>> generateQuiz(@RequestBody String text) {
        try {
            return ResponseEntity.ok(summaryService.generateBlankQuiz(text));
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/reverse-question")
    public ResponseEntity<String> generateReverseQuestion(@RequestBody Map<String, String> request) {
        String reverseQuestion = summaryService.generateReverseQuestion(
                request.get("summary"),
                request.get("question"),
                request.get("answer")
        );
        return ResponseEntity.ok(reverseQuestion);
    }

    @PostMapping("/evaluate-answer")
    public ResponseEntity<String> evaluateAnswer(@RequestBody Map<String, String> request) {
        String feedback = summaryService.evaluateAnswer(
                request.get("summary"),
                request.get("reverseQuestion"),
                request.get("userAnswer")
        );
        return ResponseEntity.ok(feedback);
    }

    @GetMapping("/summaries")
    public ResponseEntity<List<SummaryNote>> getSummaries() {
        return ResponseEntity.ok(learningDataService.getAllSummaries());
    }

    @GetMapping("/summary/{id}")
    public ResponseEntity<SummaryNote> getSummary(@PathVariable Long id) {
        return ResponseEntity.ok(learningDataService.getSummary(id));
    }

    @PostMapping("/reverse-log")
    public ResponseEntity<ReverseLearningLog> saveReverseLog(@RequestBody Map<String, String> request) {
        ReverseLearningLog log = learningDataService.saveReverseLearningLog(
                parseOptionalLong(request.get("summaryId")),
                request.get("reverseQuestion"),
                request.get("userAnswer"),
                request.get("aiFeedback")
        );

        return ResponseEntity.ok(log);
    }

    @PostMapping("/memo")
    public ResponseEntity<StudyMemo> saveMemo(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody Map<String, String> request
    ) {
        StudyMemo memo = learningDataService.saveMemo(
                userId,
                parseOptionalLong(request.get("summaryId")),
                request.get("memoContent")
        );

        return ResponseEntity.ok(memo);
    }

    @GetMapping("/memo/{summaryId}")
    public ResponseEntity<List<StudyMemo>> getMemos(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable Long summaryId
    ) {
        return ResponseEntity.ok(learningDataService.getMemos(userId, summaryId));
    }

    private Long parseOptionalLong(String value) {
        if (value == null || value.isBlank()) {
            return 0L;
        }
        return Long.parseLong(value);
    }
}
