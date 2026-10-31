package devpilot.backend.dto;

public record DocGap(
        String filePath,
        String gapType,
        String description
) {
}
