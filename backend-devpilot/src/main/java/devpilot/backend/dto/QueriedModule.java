package devpilot.backend.dto;

public record QueriedModule(
        String modulePath,
        int queryCount
) {
}
