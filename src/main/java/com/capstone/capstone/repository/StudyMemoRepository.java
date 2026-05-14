package com.capstone.capstone.repository;

import com.capstone.capstone.domain.StudyMemo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudyMemoRepository extends JpaRepository<StudyMemo, Long> {
    List<StudyMemo> findBySummaryId(Long summaryId);
    List<StudyMemo> findByUserIdAndSummaryIdOrderByCreatedAtDesc(String userId, Long summaryId);
}
