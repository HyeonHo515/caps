package com.capstone.capstone.repository;

import com.capstone.capstone.domain.SummaryNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SummaryNoteRepository extends JpaRepository<SummaryNote, Long> {
    List<SummaryNote> findByPdfId(Long pdfId);
}
