package devpilot.backend.dto;

public record HealthInsight(
        String category,
        String severity,
        String title,
        String description,
        String evidencePath
) {
}
