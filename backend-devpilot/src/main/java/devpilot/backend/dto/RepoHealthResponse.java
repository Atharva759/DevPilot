package devpilot.backend.dto;

import java.util.List;
import java.util.UUID;

public record RepoHealthResponse(
        UUID repoId,
        double embeddingCoverage,
        int totalFiles,
        int indexedFiles,
        int chunkCount,
        List<DocGap> docGaps,
        List<QueriedModule> topQueriedModules,
        List<HealthInsight> insights
) {
}
