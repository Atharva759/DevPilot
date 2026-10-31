package devpilot.backend.Services;

import devpilot.backend.Entity.ChatMessage;
import devpilot.backend.Entity.ChatSession;
import devpilot.backend.Entity.Repository;
import devpilot.backend.Entity.User;
import devpilot.backend.Repository.ChatMessageRepository;
import devpilot.backend.Repository.ChatSessionRepository;
import devpilot.backend.Services.ai.CitationMapper;
import devpilot.backend.Services.github.GitHubApiClient;
import devpilot.backend.dto.CitationDto;
import devpilot.backend.dto.DocGap;
import devpilot.backend.dto.HealthInsight;
import devpilot.backend.dto.QueriedModule;
import devpilot.backend.dto.RepoHealthResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepoHealthService {

    private final RepoService repoService;
    private final UserService userService;
    private final GitHubApiClient gitHubApiClient;
    private final ChatSessionRepository chatSessionRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final CitationMapper citationMapper;

    public RepoHealthResponse getHealth(UUID repoId, UUID userId) {
        Repository repo = repoService.requireOwned(repoId, userId);
        User user = userService.requiredById(userId);
        String token = userService.decryptAccessToken(user);

        int totalFiles = repo.getFilesTotal();
        int indexedFiles = repo.getFilesProcessed();
        int chunkCount = repo.getChunkCount();

        double embeddingCoverage = totalFiles > 0
                ? Math.min(100.0, Math.round(((double) indexedFiles / totalFiles) * 1000.0) / 10.0)
                : 0.0;

        TreeAnalysis treeAnalysis = analyzeRepoTree(repo, token);
        List<QueriedModule> topQueriedModules = computeTopQueriedModules(repo.getId());

        return new RepoHealthResponse(
                repo.getId(),
                embeddingCoverage,
                totalFiles,
                indexedFiles,
                chunkCount,
                treeAnalysis.docGaps(),
                topQueriedModules,
                treeAnalysis.insights()
        );
    }

    @SuppressWarnings("unchecked")
    private TreeAnalysis analyzeRepoTree(Repository repo, String token) {
        try {
            Map<String, Object> tree = gitHubApiClient.getRepoTree(
                    token, repo.getOwner(), repo.getName(), repo.getDefaultBranch());

            if (tree == null || tree.get("tree") == null) {
                return new TreeAnalysis(List.of(), List.of());
            }

            List<Map<String, Object>> entries = (List<Map<String, Object>>) tree.get("tree");
            Set<String> paths = new HashSet<>();
            Set<String> directories = new HashSet<>();
            Map<String, Long> fileSizes = new HashMap<>();

            for (Map<String, Object> entry : entries) {
                String path = String.valueOf(entry.get("path"));
                String normalizedPath = path.toLowerCase(Locale.ROOT);
                paths.add(normalizedPath);
                if ("blob".equals(entry.get("type")) && entry.get("size") instanceof Number size) {
                    fileSizes.put(normalizedPath, size.longValue());
                }

                int lastSlash = path.lastIndexOf('/');
                if (lastSlash > 0) {
                    directories.add(path.substring(0, lastSlash).toLowerCase(Locale.ROOT));
                }
            }

            boolean truncated = Boolean.TRUE.equals(tree.get("truncated"));
            List<DocGap> gaps = computeDocGaps(paths, directories, entries.size(), truncated);
            List<HealthInsight> insights = computeInsights(paths, fileSizes, truncated);

            return new TreeAnalysis(gaps, insights);
        } catch (Exception ex) {
            log.warn("Could not analyze repository tree for {}: {}", repo.getFullName(), ex.getMessage());
            return new TreeAnalysis(List.of(), List.of(new HealthInsight(
                    "REPOSITORY",
                    "INFO",
                    "Repository file analysis unavailable",
                    "Could not inspect the GitHub file tree. Check GitHub access and try refreshing health metrics.",
                    null
            )));
        }
    }

    private List<DocGap> computeDocGaps(
            Set<String> paths,
            Set<String> directories,
            int entryCount,
            boolean truncated) {
        List<DocGap> gaps = new ArrayList<>();
        if (truncated) {
            return gaps;
        }

        boolean hasReadme = paths.stream().anyMatch(p ->
                p.equals("readme.md") || p.equals("readme") || p.equals("readme.txt") || p.equals("readme.rst"));
        if (!hasReadme) {
            gaps.add(new DocGap(
                    "README.md",
                    "MISSING_README",
                    "No root README found. A project overview, installation, and setup guide is strongly recommended."
            ));
        }

        boolean hasLicense = paths.stream().anyMatch(p ->
                p.equals("license") || p.equals("license.md") || p.equals("license.txt") || p.equals("copying"));
        if (!hasLicense) {
            gaps.add(new DocGap(
                    "LICENSE",
                    "MISSING_LICENSE",
                    "No license file detected. Specify an open source or proprietary license."
            ));
        }

        boolean hasContributing = paths.stream().anyMatch(p ->
                p.equals("contributing.md") || p.equals(".github/contributing.md"));
        if (!hasContributing) {
            gaps.add(new DocGap(
                    "CONTRIBUTING.md",
                    "MISSING_CONTRIBUTING",
                    "No contributing guidelines found for onboarding contributors or developers."
            ));
        }

        boolean hasDocs = directories.stream().anyMatch(d ->
                d.equals("docs") || d.equals("doc") || d.equals("documentation"));
        if (!hasDocs && entryCount > 20) {
            gaps.add(new DocGap(
                    "docs/",
                    "MISSING_DOCS_DIR",
                    "No dedicated documentation folder (`docs/`) found for architecture, guides, or API specs."
            ));
        }

        for (String dir : directories) {
            long slashCount = dir.chars().filter(ch -> ch == '/').count();
            if (slashCount == 1 || slashCount == 2) {
                String readmePath1 = dir + "/readme.md";
                String readmePath2 = dir + "/readme";
                if (!paths.contains(readmePath1) && !paths.contains(readmePath2)) {
                    long filesInDir = paths.stream().filter(p -> p.startsWith(dir + "/")).count();
                    if (filesInDir >= 8 && gaps.size() < 12) {
                        gaps.add(new DocGap(
                                dir + "/README.md",
                                "MODULE_DOC_GAP",
                                "Module contains " + filesInDir + " files without an explanatory README."
                        ));
                    }
                }
            }
        }

        return gaps;
    }

    private List<HealthInsight> computeInsights(
            Set<String> paths,
            Map<String, Long> fileSizes,
            boolean truncated) {
        List<HealthInsight> insights = new ArrayList<>();

        if (truncated) {
            insights.add(new HealthInsight(
                    "REPOSITORY",
                    "INFO",
                    "File-tree analysis is partial",
                    "GitHub marked the recursive tree as truncated, so missing-file checks may not cover the entire repository.",
                    null
            ));
            return insights;
        }

        boolean hasTests = paths.stream().anyMatch(path ->
                path.matches("(^|.*/)(test|tests|__tests__|spec|specs)(/.*)?")
                        || path.matches("(^|.*/)[^/]+\\.(test|spec)\\.[^.]+$"));
        if (!hasTests) {
            insights.add(new HealthInsight(
                    "TESTING",
                    "MEDIUM",
                    "No test files detected",
                    "No common test directory or .test/.spec file was found. Add automated tests for critical behavior and regressions.",
                    null
            ));
        }

        boolean hasCi = paths.stream().anyMatch(path -> path.startsWith(".github/workflows/"))
                || paths.contains(".gitlab-ci.yml")
                || paths.contains(".circleci/config.yml")
                || paths.contains("jenkinsfile")
                || paths.contains(".buildkite/pipeline.yml");
        if (!hasCi) {
            insights.add(new HealthInsight(
                    "CI",
                    "MEDIUM",
                    "No CI workflow file detected",
                    "No common CI configuration was found in the repository tree. A CI pipeline can run tests and checks on each change.",
                    null
            ));
        }

        List<String> packageManifests = paths.stream()
                .filter(path -> path.equals("package.json") || path.endsWith("/package.json"))
                .sorted()
                .toList();
        List<String> missingLockfiles = packageManifests.stream()
                .filter(manifest -> !hasNodeLockfile(paths, parentDirectory(manifest)))
                .limit(5)
                .toList();
        if (!missingLockfiles.isEmpty()) {
            insights.add(new HealthInsight(
                    "DEPENDENCIES",
                    "MEDIUM",
                    "Node dependencies are not locked",
                    "A package.json was found without package-lock.json, pnpm-lock.yaml, yarn.lock, or bun.lock in the same directory. Lockfiles improve reproducible installs.",
                    String.join(", ", missingLockfiles)
            ));
        }

        List<String> trackedEnvFiles = paths.stream()
                .filter(this::isLikelyEnvironmentFile)
                .sorted()
                .limit(5)
                .toList();
        if (!trackedEnvFiles.isEmpty()) {
            insights.add(new HealthInsight(
                    "SECURITY",
                    "HIGH",
                    "Environment file tracked in Git",
                    "Tracked environment files can contain credentials. Verify these files contain no secrets and move private values to a secret manager; this check flags filenames only.",
                    String.join(", ", trackedEnvFiles)
            ));
        }

        if (!paths.contains("security.md") && !paths.contains(".github/security.md")) {
            insights.add(new HealthInsight(
                    "SECURITY",
                    "LOW",
                    "No security policy file detected",
                    "A SECURITY.md helps users report vulnerabilities responsibly. Its absence does not mean the repository is vulnerable.",
                    null
            ));
        }

        List<String> largeFiles = fileSizes.entrySet().stream()
                .filter(entry -> entry.getValue() >= 5L * 1024 * 1024)
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> entry.getKey() + " (" + Math.round(entry.getValue() / (1024.0 * 1024.0)) + " MB)")
                .toList();
        if (!largeFiles.isEmpty()) {
            insights.add(new HealthInsight(
                    "REPOSITORY",
                    "LOW",
                    "Large files committed to Git",
                    "Files at least 5 MB were found. Large binaries can increase clone and history size; consider Git LFS where appropriate.",
                    String.join(", ", largeFiles)
            ));
        }

        return insights;
    }

    private boolean hasNodeLockfile(Set<String> paths, String directory) {
        String prefix = directory.isEmpty() ? "" : directory + "/";
        return paths.contains(prefix + "package-lock.json")
                || paths.contains(prefix + "npm-shrinkwrap.json")
                || paths.contains(prefix + "pnpm-lock.yaml")
                || paths.contains(prefix + "yarn.lock")
                || paths.contains(prefix + "bun.lock")
                || paths.contains(prefix + "bun.lockb");
    }

    private String parentDirectory(String path) {
        int separator = path.lastIndexOf('/');
        return separator < 0 ? "" : path.substring(0, separator);
    }

    private boolean isLikelyEnvironmentFile(String path) {
        String name = path.substring(path.lastIndexOf('/') + 1);
        if (!name.startsWith(".env")) {
            return false;
        }

        String normalized = name.toLowerCase(Locale.ROOT);
        return !normalized.endsWith(".example")
                && !normalized.endsWith(".sample")
                && !normalized.endsWith(".template")
                && !normalized.endsWith(".dist");
    }

    private record TreeAnalysis(List<DocGap> docGaps, List<HealthInsight> insights) {}

    private List<QueriedModule> computeTopQueriedModules(UUID repoId) {
        List<ChatSession> sessions = chatSessionRepository.findByRepositoryId(repoId);
        if (sessions.isEmpty()) {
            return List.of();
        }

        List<UUID> sessionIds = sessions.stream().map(ChatSession::getId).toList();
        List<ChatMessage> messages = chatMessageRepository.findBySessionIdIn(sessionIds);

        Map<String, Integer> moduleCounts = new HashMap<>();

        for (ChatMessage message : messages) {
            if (message.getCitations() == null || message.getCitations().isBlank()) {
                continue;
            }

            List<CitationDto> citations = citationMapper.fromJson(message.getCitations());
            for (CitationDto citation : citations) {
                String path = citation.filePath();
                if (path == null || path.isBlank()) continue;

                String module = extractModule(path);
                moduleCounts.put(module, moduleCounts.getOrDefault(module, 0) + 1);
            }
        }

        return moduleCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(10)
                .map(e -> new QueriedModule(e.getKey(), e.getValue()))
                .toList();
    }

    private String extractModule(String filePath) {
        String normalized = filePath.replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        if (lastSlash <= 0) {
            return normalized;
        }

        // Return directory path
        return normalized.substring(0, lastSlash);
    }
}
