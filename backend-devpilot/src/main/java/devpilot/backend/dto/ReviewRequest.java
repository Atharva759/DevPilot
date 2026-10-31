package devpilot.backend.dto;

import java.util.UUID;

public record ReviewRequest(
        String diff,
        String prUrl,
        UUID repoId
) {
}
