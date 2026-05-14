package com.capstone.capstone.repository;

import com.capstone.capstone.domain.PdfDocument;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PdfDocumentRepository extends JpaRepository<PdfDocument, Long> {
}
