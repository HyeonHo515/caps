package com.capstone.capstone.repository;

import com.capstone.capstone.domain.ReverseLearningLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReverseLearningLogRepository extends JpaRepository<ReverseLearningLog, Long> {
    List<ReverseLearningLog> findBySummaryId(Long summaryId);
}
