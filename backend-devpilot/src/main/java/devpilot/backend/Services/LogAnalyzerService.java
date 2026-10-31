package devpilot.backend.Services;

import devpilot.backend.Exceptions.BadRequestException;
import devpilot.backend.Services.ai.LogAnalysisPromptBuilder;
import devpilot.backend.dto.AiTextResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogAnalyzerService {

    private static final int MAX_LOG_CHARS = 25_000;

    private final ChatClient chatClient;
    private final LogAnalysisPromptBuilder promptBuilder;

    public AiTextResponse analyzeLog(String rawLog) {
        if (rawLog == null || rawLog.isBlank()) {
            throw new BadRequestException("Log content cannot be empty");
        }

        String preparedLog = extractRelevantLog(rawLog);
        String systemPrompt = promptBuilder.systemPrompt();
        String userPrompt = promptBuilder.userPrompt(preparedLog);

        try {
            String analysis = chatClient.prompt()
                            .system(systemPrompt)
                            .user(userPrompt)
                            .options(OpenAiChatOptions.builder()
                                    .extraBody(Map.of(
                                            "chat_template_kwargs",
                                            Map.of("enable_thinking", false))))
                            .call()
                            .content();
            if (analysis == null || analysis.isBlank()) {
                throw new IllegalStateException("The AI returned an empty log analysis");
            }
            return new AiTextResponse(analysis);
        } catch (Exception ex) {
            log.error("Log analysis failed", ex);
            throw new IllegalStateException("Log analysis failed: " + ex.getMessage(), ex);
        }
    }

    private String extractRelevantLog(String rawLog) {
        String trimmed = rawLog.trim();
        if (trimmed.length() <= MAX_LOG_CHARS) {
            return trimmed;
        }

        // CI logs failure context is virtually always at the tail end
        String tail = trimmed.substring(trimmed.length() - MAX_LOG_CHARS);
        return "... [Log truncated: showing final 25,000 characters containing failure context] ...\n\n" + tail;
    }
}
