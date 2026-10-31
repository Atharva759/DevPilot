package devpilot.backend.Services.ai;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import devpilot.backend.Entity.ChatMessage;
import devpilot.backend.Entity.MessageRole;
import devpilot.backend.Repository.ChatMessageRepository;
import devpilot.backend.dto.ChatMessageResponse;
import devpilot.backend.dto.CitationDto;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Generation step: call OpenAI via Spring AI and stream tokens to the browser over SSE.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ChatStreamHandler {

    private final ChatClient chatClient;
    private final ChatMessageRepository chatMessageRepository;
    private final CitationMapper citationMapper;

    public SseEmitter stream(
            UUID sessionId,
            ChatMessageResponse savedUserMessage,
            List<CitationDto> citations,
            String systemPrompt,
            String userPrompt) {

        SseEmitter emitter = new SseEmitter(RagSettings.STREAM_TIMEOUT_MS);
        StringBuilder fullReply = new StringBuilder();

        try {
            log.info("Starting chat stream for session: {}", sessionId);

            emitter.send(SseEmitter.event()
                    .name("user_message")
                    .data(savedUserMessage));

            chatClient
                    .prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .options(OpenAiChatOptions.builder()
                            .extraBody(Map.of(
                                    "chat_template_kwargs",
                                    Map.of("enable_thinking", false))))
                    .stream()
                    .content()
                    .subscribe(
                    token -> appendToken(emitter, fullReply, token),
                    err -> completeWithErrorEvent(emitter, "AI generation failed", err),
                    () -> {
                        log.info(
                                "Chat stream completed. Response length={}",
                                fullReply.length()
                        );

                        completeStream(
                                emitter,
                                sessionId,
                                fullReply,
                                citations
                        );
                    });

        } catch (Exception ex) {
            log.error("Failed to initialize chat stream", ex);
            completeWithErrorEvent(emitter, "AI generation failed", ex);
        }

        return emitter;
    }

    private void appendToken(SseEmitter emitter, StringBuilder fullReply, String token) {
        fullReply.append(token);
        try {
            emitter.send(SseEmitter.event()
                    .name("token")
                    .data(token, MediaType.APPLICATION_JSON));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private void completeStream(
            SseEmitter emitter,
            UUID sessionId,
            StringBuilder fullReply,
            List<CitationDto> citations) {
        if (fullReply.isEmpty()) {
            completeWithErrorEvent(
                    emitter,
                    "AI returned an empty response",
                    new IllegalStateException("No answer text was received from the chat model"));
            return;
        }

        try {
            ChatMessage assistant = chatMessageRepository.save(ChatMessage.builder()
                    .sessionId(sessionId)
                    .role(MessageRole.ASSISTANT)
                    .content(fullReply.toString())
                    .citations(citationMapper.toJson(citations))
                    .build());

            emitter.send(SseEmitter.event()
                    .name("assistant_message")
                    .data(toMessageResponse(assistant)));
            emitter.send(SseEmitter.event().name("done").data("[DONE]"));
            emitter.complete();
        } catch (Exception ex) {
            completeWithErrorEvent(emitter, "Could not finish chat response", ex);
        }
    }

    private void completeWithErrorEvent(SseEmitter emitter, String message, Throwable error) {
        log.error("Chat stream failed: {}", message, error);
        try {
            String detail = error.getMessage();
            emitter.send(SseEmitter.event()
                    .name("error")
                    .data(message + (detail == null || detail.isBlank() ? "" : ": " + detail)));
        } catch (Exception sendEx) {
            log.warn("Could not send chat stream error event", sendEx);
        } finally {
            emitter.complete();
        }
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getRole(),
                message.getContent(),
                citationMapper.fromJson(message.getCitations()),
                message.getCreatedAt());
    }
}
