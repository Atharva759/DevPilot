package devpilot.backend.Controller;

import devpilot.backend.Exceptions.BadRequestException;
import devpilot.backend.Services.LogAnalyzerService;
import devpilot.backend.dto.AiTextResponse;
import devpilot.backend.dto.LogAnalysisRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogAnalyzerController {

    private final LogAnalyzerService logAnalyzerService;

    @PostMapping(value = "/analyze", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AiTextResponse> analyzeLogJson(@RequestBody LogAnalysisRequest request) {
        if (request == null || request.logContent() == null || request.logContent().isBlank()) {
            throw new BadRequestException("Log content cannot be empty");
        }
        return ResponseEntity.ok(logAnalyzerService.analyzeLog(request.logContent()));
    }

    @PostMapping(value = "/analyze/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AiTextResponse> analyzeLogUpload(@RequestPart("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Uploaded log file cannot be empty");
        }
        try {
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            return ResponseEntity.ok(logAnalyzerService.analyzeLog(content));
        } catch (IOException e) {
            throw new BadRequestException("Failed to read uploaded log file: " + e.getMessage());
        }
    }
}
