package devpilot.backend.Services.ai;

import devpilot.backend.dto.CitationDto;

import java.util.List;

public record RetrievedContext(
        List<CitationDto> citations,
        String contextText
) {
}
