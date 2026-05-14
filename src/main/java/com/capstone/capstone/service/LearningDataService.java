package com.capstone.capstone.service;

import com.capstone.capstone.domain.PdfDocument;
import com.capstone.capstone.domain.ReverseLearningLog;
import com.capstone.capstone.domain.StudyMemo;
import com.capstone.capstone.domain.SummaryNote;
import com.capstone.capstone.repository.PdfDocumentRepository;
import com.capstone.capstone.repository.ReverseLearningLogRepository;
import com.capstone.capstone.repository.StudyMemoRepository;
import com.capstone.capstone.repository.SummaryNoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LearningDataService {

    private final PdfDocumentRepository pdfDocumentRepository;
    private final SummaryNoteRepository summaryNoteRepository;
    private final ReverseLearningLogRepository reverseLearningLogRepository;
    private final StudyMemoRepository studyMemoRepository;

    public PdfDocument savePdf(String fileName, String extractedText) {
        PdfDocument pdf = new PdfDocument();
        pdf.setFileName(fileName);
        pdf.setExtractedText(extractedText);
        return pdfDocumentRepository.save(pdf);
    }

    public SummaryNote saveSummary(Long pdfId, String summary, String quizQuestion, String quizAnswer) {
        SummaryNote note = new SummaryNote();
        note.setPdfId(pdfId);
        note.setSummary(summary);
        note.setQuizQuestion(quizQuestion);
        note.setQuizAnswer(quizAnswer);
        note.setPageNumber(1);
        note.setUserId("guest");
        return summaryNoteRepository.save(note);
    }

    public List<SummaryNote> getAllSummaries() {
        return summaryNoteRepository.findAll();
    }

    public SummaryNote getSummary(Long summaryId) {
        return summaryNoteRepository.findById(summaryId)
                .orElseThrow(() -> new IllegalArgumentException("요약 정보를 찾을 수 없습니다."));
    }

    public ReverseLearningLog saveReverseLearningLog(Long summaryId, String reverseQuestion, String userAnswer, String aiFeedback) {
        ReverseLearningLog log = new ReverseLearningLog();
        log.setSummaryId(summaryId);
        log.setReverseQuestion(reverseQuestion);
        log.setUserAnswer(userAnswer);
        log.setAiFeedback(aiFeedback);
        log.setUserId("guest");
        return reverseLearningLogRepository.save(log);
    }

    public List<ReverseLearningLog> getReverseLogs(Long summaryId) {
        return reverseLearningLogRepository.findBySummaryId(summaryId);
    }

    public StudyMemo saveMemo(String userId, Long summaryId, String memoContent) {
        if (memoContent == null || memoContent.isBlank()) {
            throw new IllegalArgumentException("메모 내용을 입력해주세요.");
        }

        StudyMemo memo = new StudyMemo();
        memo.setSummaryId(summaryId == null ? 0L : summaryId);
        memo.setMemoContent(memoContent.trim());
        memo.setUserId(normalizeUserId(userId));
        return studyMemoRepository.save(memo);
    }

    public List<StudyMemo> getMemos(String userId, Long summaryId) {
        return studyMemoRepository.findByUserIdAndSummaryIdOrderByCreatedAtDesc(
                normalizeUserId(userId),
                summaryId == null ? 0L : summaryId
        );
    }

    private String normalizeUserId(String userId) {
        return userId == null || userId.isBlank() ? "guest" : userId.trim();
    }
}
