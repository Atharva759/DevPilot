package devpilot.backend.Services.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;


import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Component
@Primary
public class NvidiaEmbeddingModel implements EmbeddingModel {

    private static final String MODEL = "nvidia/nemotron-3-embed-1b";
    private static final int DIMENSIONS = 2048;

    private final RestClient restClient;

    public NvidiaEmbeddingModel(
            @Value("${nvidia.api-key}") String apiKey) {

        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(120))
                .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);

        requestFactory.setReadTimeout(Duration.ofSeconds(180));

        this.restClient = RestClient.builder()
                .baseUrl("https://integrate.api.nvidia.com/v1")

                .requestFactory(requestFactory)

                .defaultHeader(
                        "Authorization",
                        "Bearer " + apiKey)

                .defaultHeader(
                        "Content-Type",
                        MediaType.APPLICATION_JSON_VALUE)

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
                embedBatch(texts, "query");

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

    private List<float[]> embedBatch(
            List<String> texts,
            String inputType) {

        if (texts == null || texts.isEmpty()) {
            return List.of();
        }

        NvidiaEmbeddingRequest request =
                new NvidiaEmbeddingRequest(
                        texts,
                        MODEL,
                        inputType,
                        "text",
                        "float",
                        "float"
                );

        NvidiaEmbeddingResponse response =
                restClient.post()
                        .uri("/embeddings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(request)
                        .retrieve()
                        .body(NvidiaEmbeddingResponse.class);

        if (response == null ||
                response.data() == null) {

            throw new IllegalStateException(
                    "NVIDIA embedding API returned an empty response"
            );
        }

        return response.data()
                .stream()
                .sorted(
                        (a, b) ->
                                Integer.compare(
                                        a.index(),
                                        b.index()
                                )
                )
                .map(NvidiaEmbeddingData::embedding)
                .toList();
    }

    public record NvidiaEmbeddingRequest(
            List<String> input,
            String model,

            @JsonProperty("input_type")
            String inputType,

            String modality,

            @JsonProperty("embedding_type")
            String embeddingType,

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