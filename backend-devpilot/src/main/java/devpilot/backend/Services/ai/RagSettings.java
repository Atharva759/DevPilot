package devpilot.backend.Services.ai;

public final class RagSettings {
    /** How many code chunks to fetch from the vector database per question. */
    public static final int TOP_K_CHUNKS = 5;

    /** Minimum similarity score to include a chunk (filters out low-quality matches). */
    public static final double SIMILARITY_THRESHOLD = 0.3;

    /** Maximum total characters of context to send to the LLM. */
    public static final int MAX_CONTEXT_CHARS = 8000;

    /** Max time (ms) to keep an SSE stream open while the model is responding. */
    public static final long STREAM_TIMEOUT_MS = 120_000L;

    /** Metadata key stored on each embedded document (must match {@link devPilot.backend.service.indexing.CodeChunker}). */
    public static final String METADATA_REPO_ID = "repoId";

    private RagSettings() {
    }
}
