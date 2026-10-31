package devpilot.backend.Services;

import devpilot.backend.Entity.User;
import devpilot.backend.Exceptions.BadRequestException;
import devpilot.backend.Services.ai.ReviewPromptBuilder;
import devpilot.backend.Services.github.GitHubApiClient;
import devpilot.backend.dto.AiTextResponse;
import devpilot.backend.dto.ReviewRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReviewService {

    private static final int MAX_DIFF_CHARS = 25_000;

    private static final Pattern PR_URL_PATTERN =
            Pattern.compile("(?:https?://github\\.com/)?([^/\\s]+)/([^/\\s]+)/pull/(\\d+)");
    private static final Pattern SHORT_PR_PATTERN =
            Pattern.compile("([^/\\s#]+)/([^/\\s#]+)#(\\d+)");

    private final ChatClient chatClient;
    private final GitHubApiClient gitHubApiClient;
    private final UserService userService;
    private final ReviewPromptBuilder promptBuilder;

    public AiTextResponse reviewDiff(UUID userId, ReviewRequest request) {
        if (request == null || request.diff() == null || request.diff().isBlank()) {
            throw new BadRequestException("Diff content cannot be empty");
        }

        String diff = sanitizeDiff(request.diff());
        String systemPrompt = promptBuilder.systemPrompt();
        String userPrompt = promptBuilder.userPrompt(diff, "Manual Diff Submission");

        return generateReview(systemPrompt, userPrompt);
    }

    public AiTextResponse reviewPr(UUID userId, ReviewRequest request) {
        if (request == null || request.prUrl() == null || request.prUrl().isBlank()) {
            throw new BadRequestException("PR URL cannot be empty");
        }

        String prUrl = request.prUrl().trim();
        PrCoordinates coords = parsePrUrl(prUrl);

        User user = userService.requiredById(userId);
        String token = userService.decryptAccessToken(user);

        log.info("Fetching diff for PR: {}/{} #{}", coords.owner(), coords.repo(), coords.prNumber());
        String diff;
        try {
            diff = gitHubApiClient.getPullRequestDiff(token, coords.owner(), coords.repo(), coords.prNumber());
        } catch (Exception ex) {
            log.error("Failed to fetch PR diff from GitHub", ex);
            throw new BadRequestException("Failed to fetch pull request diff: " + ex.getMessage());
        }

        if (diff == null || diff.isBlank()) {
            throw new BadRequestException("The pull request diff is empty or not accessible");
        }

        String sanitizedDiff = sanitizeDiff(diff);
        String sourceInfo = coords.owner() + "/" + coords.repo() + " #" + coords.prNumber();
        String systemPrompt = promptBuilder.systemPrompt();
        String userPrompt = promptBuilder.userPrompt(sanitizedDiff, sourceInfo);

        return generateReview(systemPrompt, userPrompt);
    }

    private AiTextResponse generateReview(String systemPrompt, String userPrompt) {
        try {
            String review = chatClient.prompt()
                            .system(systemPrompt)
                            .user(userPrompt)
                            .options(OpenAiChatOptions.builder()
                                    .extraBody(Map.of(
                                            "chat_template_kwargs",
                                            Map.of("enable_thinking", false))))
                            .call()
                            .content();
            if (review == null || review.isBlank()) {
                throw new IllegalStateException("The AI returned an empty review");
            }
            return new AiTextResponse(review);
        } catch (Exception ex) {
            log.error("Review generation failed", ex);
            throw new IllegalStateException("Review generation failed: " + ex.getMessage(), ex);
        }
    }

    private String sanitizeDiff(String rawDiff) {
        String trimmed = rawDiff.trim();
        if (trimmed.length() > MAX_DIFF_CHARS) {
            return trimmed.substring(0, MAX_DIFF_CHARS) + "\n\n... [Diff truncated to first 25,000 characters] ...";
        }
        return trimmed;
    }

    private PrCoordinates parsePrUrl(String url) {
        Matcher matcher = PR_URL_PATTERN.matcher(url);
        if (matcher.find()) {
            return new PrCoordinates(matcher.group(1), matcher.group(2), Integer.parseInt(matcher.group(3)));
        }

        Matcher shortMatcher = SHORT_PR_PATTERN.matcher(url);
        if (shortMatcher.find()) {
            return new PrCoordinates(shortMatcher.group(1), shortMatcher.group(2), Integer.parseInt(shortMatcher.group(3)));
        }

        throw new BadRequestException("Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123 or owner/repo#123");
    }

    private record PrCoordinates(String owner, String repo, int prNumber) {}
}
