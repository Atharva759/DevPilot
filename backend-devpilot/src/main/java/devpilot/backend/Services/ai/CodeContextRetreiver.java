package devpilot.backend.Services.ai;

import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CodeContextRetreiver {
    private static final String NO_MATCHES = "(no matching code chunks found)";

    private final VectorStore vectorStore;
    private final CitationMapper citationMapper;

    public RetrievedContext retrieve(UUID repositoryId, String question) {
        var filter = new FilterExpressionBuilder()
                .eq(RagSettings.METADATA_REPO_ID, repositoryId.toString())
                .build();

        var search = SearchRequest.builder()
                .query(question)
                .topK(RagSettings.TOP_K_CHUNKS)
                .similarityThreshold(RagSettings.SIMILARITY_THRESHOLD)
                .filterExpression(filter)
                .build();

        var documents = vectorStore.similaritySearch(search);

        var citations = documents.stream()
                .map(citationMapper::fromDocument)
                .distinct()
                .toList();

        // Build context text, capping at MAX_CONTEXT_CHARS to avoid slow LLM responses
        var sb = new StringBuilder();
        for (Document doc : documents) {
            String text = doc.getText();
            if (sb.length() + text.length() + 5 > RagSettings.MAX_CONTEXT_CHARS) {
                // Add as much as we can fit
                int remaining = RagSettings.MAX_CONTEXT_CHARS - sb.length() - 5;
                if (remaining > 100) {
                    if (sb.length() > 0) sb.append("\n\n---\n\n");
                    sb.append(text, 0, remaining);
                }
                break;
            }
            if (sb.length() > 0) sb.append("\n\n---\n\n");
            sb.append(text);
        }

        String contextText = sb.length() > 0 ? sb.toString() : NO_MATCHES;

        return new RetrievedContext(citations, contextText);
    }
}

