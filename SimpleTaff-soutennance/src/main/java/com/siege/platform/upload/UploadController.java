package com.siege.platform.upload;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    @GetMapping
    public ResponseEntity<Map<String, String>> mockGetUpload() {
        return ResponseEntity.ok(Map.of("message", "Upload endpoint stubbed. Real implementation requires S3 or local storage.", "url", "https://dummyimage.com/600x400/000/fff&text=Document+Upload"));
    }
}
