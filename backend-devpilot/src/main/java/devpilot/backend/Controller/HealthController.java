package devpilot.backend.Controller;

import devpilot.backend.Security.CurrentUser;
import devpilot.backend.Services.RepoHealthService;
import devpilot.backend.dto.RepoHealthResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/repos")
@RequiredArgsConstructor
public class HealthController {

    private final CurrentUser currentUser;
    private final RepoHealthService repoHealthService;

    @GetMapping("/{id}/health")
    public ResponseEntity<RepoHealthResponse> getRepoHealth(@PathVariable UUID id) {
        UUID userId = currentUser.require().getId();
        return ResponseEntity.ok(repoHealthService.getHealth(id, userId));
    }
}
