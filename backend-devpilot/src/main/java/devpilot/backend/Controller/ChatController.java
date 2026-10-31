package devpilot.backend.Controller;

import java.util.List;
import java.util.UUID;

import devpilot.backend.Security.CurrentUser;
import devpilot.backend.Services.ChatService;
import devpilot.backend.Services.ai.RagSettings;
import devpilot.backend.dto.ChatMessageRequest;
import devpilot.backend.dto.ChatMessageResponse;
import devpilot.backend.dto.ChatSessionResponse;
import devpilot.backend.dto.CreateChatSessionRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final CurrentUser currentUser;
    private final ChatService chatService;

    @PostMapping("/sessions")
    public ResponseEntity<ChatSessionResponse> createSession(
            @Valid @RequestBody CreateChatSessionRequest request) {
        UUID userId = currentUser.require().getId();
        return ResponseEntity.ok(chatService.createSession(userId, request));
    }

    @GetMapping("/sessions")
    public List<ChatSessionResponse> listSessions(@RequestParam UUID repositoryId) {
        UUID userId = currentUser.require().getId();
        return chatService.listSessions(userId, repositoryId);
    }

    @GetMapping("/sessions/{id}")
    public List<ChatMessageResponse> getMessages(@PathVariable UUID id) {
        UUID userId = currentUser.require().getId();
        return chatService.getMessages(userId, id);
    }

    @PostMapping(value = "/sessions/{id}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter sendMessage(
            @PathVariable UUID id,
            @Valid @RequestBody ChatMessageRequest request) {
        UUID userId = currentUser.require().getId();
        try {
            return chatService.streamReply(userId, id, request.content());
        } catch (RuntimeException ex) {
            log.error("Failed to prepare chat stream", ex);
            SseEmitter emitter = new SseEmitter(RagSettings.STREAM_TIMEOUT_MS);
            try {
                String detail = ex.getMessage();
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("Could not prepare chat response"
                                + (detail == null || detail.isBlank() ? "" : ": " + detail)));
            } catch (Exception sendEx) {
                log.warn("Could not send chat preparation error event", sendEx);
            } finally {
                emitter.complete();
            }
            return emitter;
        }
    }
}
