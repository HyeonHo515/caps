package com.capstone.capstone.repository;

import com.capstone.capstone.domain.WrongNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WrongNoteRepository extends JpaRepository<WrongNote, Long> {

    List<WrongNote> findAllByOrderByIdDesc();

    List<WrongNote> findByUserIdOrderByIdDesc(String userId);
}
