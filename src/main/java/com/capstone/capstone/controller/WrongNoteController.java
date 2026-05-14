package com.capstone.capstone.controller;

import com.capstone.capstone.domain.WrongNote;
import com.capstone.capstone.service.WrongNoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WrongNoteController {

    private final WrongNoteService wrongNoteService;

    @GetMapping
    public ResponseEntity<List<WrongNote>> getNotes(@RequestHeader(value = "X-User-Id", required = false) String userId) {
        return ResponseEntity.ok(wrongNoteService.getAllNotes(userId));
    }

    @PostMapping
    public ResponseEntity<WrongNote> createNote(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestBody WrongNote note
    ) {
        return ResponseEntity.ok(wrongNoteService.saveNote(userId, note));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WrongNote> updateNote(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable Long id,
            @RequestBody WrongNote note
    ) {
        return ResponseEntity.ok(wrongNoteService.updateNote(userId, id, note));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @PathVariable Long id
    ) {
        wrongNoteService.deleteNote(userId, id);
        return ResponseEntity.noContent().build();
    }
}
