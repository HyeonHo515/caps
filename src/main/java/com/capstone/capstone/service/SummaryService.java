package com.capstone.capstone.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SummaryService {

    private static final String OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";
    private static final String API_KEY_PLACEHOLDER_PREFIX = "open api key";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.api.key:}")
    private String apiKey;

    public String summarize(String text) {
        if (!hasApiKey()) {
            return localSummary(text);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", "You are a computer science tutor. Summarize in Korean with short bullet points."
        ));
        messages.add(Map.of(
                "role", "user",
                "content", "Summarize this study material in 3 to 5 Korean bullet points:\n" + safeText(text)
        ));

        try {
            return requestOpenAi(messages, 500);
        } catch (Exception e) {
            return localSummary(text);
        }
    }

    public Map<String, Object> generateBlankQuiz(String text) throws Exception {
        if (!hasApiKey()) {
            return localBlankQuiz(text);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", "Create one Korean fill-in-the-blank quiz. Return JSON only: {\"question\":\"...\",\"answer\":\"...\"}."
        ));
        messages.add(Map.of(
                "role", "user",
                "content", "Create a fill-in-the-blank quiz from this material:\n" + safeText(text)
        ));

        try {
            String content = stripJsonFence(requestOpenAi(messages, 250));
            return objectMapper.readValue(content, Map.class);
        } catch (Exception e) {
            return localBlankQuiz(text);
        }
    }

    public String generateReverseQuestion(String summary, String question, String answer) {
        if (!hasApiKey()) {
            return "Explain the answer concept in your own words: " + safeText(answer);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", "You are a CS tutor. Create one short Korean question that checks conceptual understanding."
        ));
        messages.add(Map.of(
                "role", "user",
                "content",
                "Summary: " + safeText(summary) + "\n" +
                        "Question: " + safeText(question) + "\n" +
                        "Answer: " + safeText(answer) + "\n" +
                        "Create one deeper follow-up question in Korean."
        ));

        try {
            return requestOpenAi(messages, 150);
        } catch (Exception e) {
            return "Explain the answer concept in your own words: " + safeText(answer);
        }
    }

    public String evaluateAnswer(String summary, String reverseQuestion, String userAnswer) {
        if (!hasApiKey()) {
            return localEvaluation(userAnswer);
        }

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", "You are a CS tutor. Evaluate the user's answer in Korean and give strengths plus improvements."
        ));
        messages.add(Map.of(
                "role", "user",
                "content",
                "Summary: " + safeText(summary) + "\n" +
                        "AI question: " + safeText(reverseQuestion) + "\n" +
                        "User answer: " + safeText(userAnswer) + "\n\n" +
                        "Return Korean feedback with: 1. Evaluation 2. Strength 3. Improvement."
        ));

        try {
            return requestOpenAi(messages, 400);
        } catch (Exception e) {
            return localEvaluation(userAnswer);
        }
    }

    private boolean hasApiKey() {
        return apiKey != null
                && !apiKey.isBlank()
                && !apiKey.trim().toLowerCase().startsWith(API_KEY_PLACEHOLDER_PREFIX);
    }

    private String requestOpenAi(List<Map<String, String>> messages, int maxTokens) {
        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = new HashMap<>();
        body.put("model", MODEL);
        body.put("messages", messages);
        body.put("max_tokens", maxTokens);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(OPENAI_CHAT_COMPLETIONS_URL, request, Map.class);

        Map responseBody = response.getBody();
        if (responseBody == null || responseBody.get("choices") == null) {
            throw new IllegalStateException("OpenAI response body is empty.");
        }

        List choices = (List) responseBody.get("choices");
        Map firstChoice = (Map) choices.get(0);
        Map message = (Map) firstChoice.get("message");

        return String.valueOf(message.get("content"));
    }

    private String localSummary(String text) {
        String normalized = safeText(text).replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) {
            return "No content to summarize.";
        }

        String[] sentences = normalized.split("(?<=[.!?])\\s+");
        StringBuilder summary = new StringBuilder();
        int limit = Math.min(sentences.length, 4);
        for (int i = 0; i < limit; i++) {
            if (!sentences[i].isBlank()) {
                summary.append("- ").append(sentences[i].trim()).append("\n");
            }
        }

        return summary.toString().trim();
    }

    private Map<String, Object> localBlankQuiz(String text) {
        String[] keywords = {"process", "thread", "deadlock", "TCP", "UDP", "DNS", "memory", "scheduling"};
        String source = safeText(text).replaceAll("\\s+", " ").trim();

        for (String keyword : keywords) {
            if (source.toLowerCase().contains(keyword.toLowerCase())) {
                Map<String, Object> quiz = new LinkedHashMap<>();
                quiz.put("question", source.replaceFirst("(?i)" + keyword, "____"));
                quiz.put("answer", keyword);
                return quiz;
            }
        }

        Map<String, Object> quiz = new LinkedHashMap<>();
        quiz.put("question", "Explain the most important concept from this material: ____");
        quiz.put("answer", "core concept");
        return quiz;
    }

    private String localEvaluation(String userAnswer) {
        if (userAnswer == null || userAnswer.isBlank()) {
            return "Evaluation: needs improvement\nStrength: no answer yet.\nImprovement: write the key concept in one or two sentences first.";
        }

        if (userAnswer.length() >= 30) {
            return "Evaluation: good understanding\nStrength: you explained the concept in your own words.\nImprovement: add an example or contrast it with a related concept.";
        }

        return "Evaluation: needs improvement\nStrength: you started with a key idea.\nImprovement: include definition, characteristics, and use case.";
    }

    private String stripJsonFence(String content) {
        return safeText(content)
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }
}
