package devpilot.backend.Controller;

import devpilot.backend.Security.CurrentUser;
import devpilot.backend.Services.ReviewService;
import devpilot.backend.dto.AiTextResponse;
import devpilot.backend.dto.ReviewRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/review")
@RequiredArgsConstructor
public class ReviewController {

    private final CurrentUser currentUser;
    private final ReviewService reviewService;

    @PostMapping(value = "/diff", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AiTextResponse> reviewDiff(@RequestBody ReviewRequest request) {
        UUID userId = currentUser.require().getId();
        return ResponseEntity.ok(reviewService.reviewDiff(userId, request));
    }

    @PostMapping(value = "/pr", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AiTextResponse> reviewPr(@RequestBody ReviewRequest request) {
        UUID userId = currentUser.require().getId();
        return ResponseEntity.ok(reviewService.reviewPr(userId, request));
    }
}
