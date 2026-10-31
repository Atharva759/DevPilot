package devpilot.backend.Services.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import java.net.SocketTimeoutException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@Primary
@Slf4j
public class NvidiaEmbeddingModel implements EmbeddingModel {

    private static final String MODEL = "nvidia/nemotron-3-embed-1b";
    private static final int DIMENSIONS = 2048;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public NvidiaEmbeddingModel(
            @Value("${nvidia.api-key}") String apiKey) {

        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(15))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(30));

        this.objectMapper = new ObjectMapper();
        this.restClient = RestClient.builder()
                .baseUrl("https://integrate.api.nvidia.com/v1")
                .requestFactory(requestFactory)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Single Document embedding.
     *
     * Used when embedding a code chunk/document.
     * NVIDIA expects "passage" for indexing.
     */
    @Override
    public float[] embed(Document document) {

        return embedSingle(
                document.getText(),
                "passage"
        );
    }

    /**
     * Single String embedding.
     *
     * Used for similarity-search queries.
     * NVIDIA expects "query" for querying.
     */
    @Override
    public float[] embed(String text) {

        return embedSingle(
                text,
                "query"
        );
    }

    /**
     * Spring AI Model API.
     *
     * NOTE:
     * This method is generally used for text-based embedding calls.
     */
    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {

        List<String> texts = request.getInstructions();

        List<float[]> vectors =
                embedBatch(texts, "passage");

        List<Embedding> embeddings =
                new ArrayList<>(vectors.size());

        for (int i = 0; i < vectors.size(); i++) {
            embeddings.add(
                    new Embedding(vectors.get(i), i)
            );
        }

        return new EmbeddingResponse(embeddings);
    }

    @Override
    public int dimensions() {
        return DIMENSIONS;
    }

    private float[] embedSingle(
            String text,
            String inputType) {

        List<float[]> vectors =
                embedBatch(
                        List.of(text),
                        inputType
                );

        if (vectors.isEmpty()) {
            throw new IllegalStateException(
                    "NVIDIA embedding API returned no embeddings"
            );
        }

        return vectors.getFirst();
    }

    private static final int MAX_RETRIES = 3;
    private static final long INITIAL_BACKOFF_MS = 500L;
    private static final int MAX_SUB_BATCH = 16;
    private final AtomicInteger preferredBatchSize = new AtomicInteger(MAX_SUB_BATCH);

    private List<float[]> embedBatch(
            List<String> texts,
            String inputType) {

        if (texts == null || texts.isEmpty()) {
            return List.of();
        }

        List<float[]> allVectors = new ArrayList<>(texts.size());
        for (int i = 0; i < texts.size();) {
            int batchSize = preferredBatchSize.get();
            List<String> subList = texts.subList(i, Math.min(i + batchSize, texts.size()));
            allVectors.addAll(embedSubBatch(subList, inputType));
            i += subList.size();
        }

        return allVectors;
    }

    private List<float[]> embedSubBatch(
            List<String> texts,
            String inputType) {

        NvidiaEmbeddingRequest request =
                new NvidiaEmbeddingRequest(
                        texts,
                        MODEL,
                        inputType,
                        "float");

        Exception lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            lastException = null;
            ResponseEntity<byte[]> apiResponse = null;
            long requestStartedAt = System.nanoTime();
            try {
                apiResponse = restClient.post()
                        .uri("/embeddings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .accept(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .toEntity(byte[].class);
            } catch (RestClientResponseException ex) {
                if (ex.getStatusCode().value() != 429 && !ex.getStatusCode().is5xxServerError()) {
                    throw new IllegalStateException(
                            "NVIDIA embedding API rejected the request (HTTP "
                                    + ex.getStatusCode().value() + ")",
                            ex);
                }
                lastException = ex;
                log.warn("NVIDIA embedding API returned HTTP {} (attempt {}/{}): {}",
                        ex.getStatusCode().value(), attempt, MAX_RETRIES, ex.getStatusText());
            } catch (ResourceAccessException ex) {
                if (Thread.currentThread().isInterrupted()) {
                    throw new IllegalStateException("Interrupted during NVIDIA embedding request", ex);
                }
                if (isRequestCancelledOrTimedOut(ex)) {
                    if (texts.size() > 1) {
                        int midpoint = texts.size() / 2;
                        int reducedBatchSize = preferredBatchSize.updateAndGet(
                                current -> Math.min(current, midpoint));
                        log.warn("NVIDIA cancelled an embedding batch of {} texts after {} ms; "
                                        + "reducing future batches to {} and retrying as {} and {}",
                                texts.size(),
                                Duration.ofNanos(System.nanoTime() - requestStartedAt).toMillis(),
                                reducedBatchSize,
                                midpoint,
                                texts.size() - midpoint);
                        List<float[]> vectors = new ArrayList<>(texts.size());
                        vectors.addAll(embedSubBatch(texts.subList(0, midpoint), inputType));
                        vectors.addAll(embedSubBatch(texts.subList(midpoint, texts.size()), inputType));
                        return vectors;
                    }
                    throw new IllegalStateException(
                            "NVIDIA cancelled the embedding request for a batch of " + texts.size() + " texts",
                            ex);
                }
                lastException = ex;
                log.warn("NVIDIA embedding API connection failed (attempt {}/{}): {}",
                        attempt, MAX_RETRIES, ex.getMessage());
            }

            if (apiResponse != null) {
                return parseResponse(apiResponse, texts.size());
            }

            if (attempt < MAX_RETRIES) {
                try {
                    Thread.sleep(INITIAL_BACKOFF_MS * (1L << (attempt - 1)));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException("Interrupted during embedding retry backoff", ie);
                }
            }
        }

        throw new IllegalStateException("NVIDIA embedding API failed after " + MAX_RETRIES + " attempts", lastException);
    }

    private static boolean isRequestCancelledOrTimedOut(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpTimeoutException || cause instanceof SocketTimeoutException) {
                return true;
            }
            String message = cause.getMessage();
            if (message != null) {
                String normalizedMessage = message.toLowerCase(Locale.ROOT);
                if (normalizedMessage.contains("request cancelled")
                        || normalizedMessage.contains("request timed out")
                        || normalizedMessage.contains("timeout")) {
                    return true;
                }
            }
            if (cause == cause.getCause()) {
                break;
            }
        }
        return false;
    }

    private List<float[]> parseResponse(ResponseEntity<byte[]> apiResponse, int inputCount) {
        byte[] rawResponse = apiResponse.getBody();
        if (rawResponse == null || rawResponse.length == 0) {
            throw new IllegalStateException("NVIDIA embedding API returned an empty response");
        }

        NvidiaEmbeddingResponse response;
        try {
            response = objectMapper.readValue(rawResponse, NvidiaEmbeddingResponse.class);
        } catch (IOException ex) {
            throw new IllegalStateException(
                    "NVIDIA embedding API returned a non-JSON response (content type: "
                            + apiResponse.getHeaders().getContentType() + ")",
                    ex);
        }

        if (response == null || response.data() == null) {
            throw new IllegalStateException("NVIDIA embedding API returned null data");
        }

        List<NvidiaEmbeddingData> data = response.data()
                .stream()
                .sorted(Comparator.comparingInt(NvidiaEmbeddingData::index))
                .toList();
        if (data.size() != inputCount) {
            throw new IllegalStateException(
                    "NVIDIA embedding API returned " + data.size() + " vectors for " + inputCount + " inputs");
        }

        List<float[]> vectors = new ArrayList<>(data.size());
        for (int i = 0; i < data.size(); i++) {
            NvidiaEmbeddingData item = data.get(i);
            if (item == null || item.index() != i
                    || item.embedding() == null || item.embedding().length != DIMENSIONS) {
                throw new IllegalStateException(
                        "NVIDIA embedding API returned invalid vector data at index " + i);
            }
            vectors.add(item.embedding());
        }
        return vectors;
    }

    public record NvidiaEmbeddingRequest(
            List<String> input,
            String model,

            @JsonProperty("input_type")
            String inputType,

            @JsonProperty("encoding_format")
            String encodingFormat
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NvidiaEmbeddingResponse(
            List<NvidiaEmbeddingData> data
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NvidiaEmbeddingData(
            int index,
            float[] embedding
    ) {
    }
}