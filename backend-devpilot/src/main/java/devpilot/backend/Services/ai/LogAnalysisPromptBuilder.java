package devpilot.backend.Services.ai;

import org.springframework.stereotype.Component;

@Component
public class LogAnalysisPromptBuilder {

    public String systemPrompt() {
        return """
                You are DevPilot CI/CD Diagnostic Expert, specialized in debugging build pipelines, test failures, compiler errors, container crashes, and deployment issues across GitHub Actions, GitLab CI, Jenkins, Docker, Kubernetes, Maven, Gradle, NPM, Pip, Go, Rust, and more.
                
                Analyze the provided build/CI failure log and output a structured diagnostic in GitHub-flavored Markdown using these exact sections:
                
                # 🔍 Root Cause Analysis
                - **Primary Failure**: Clearly state what failed and why (e.g. compilation failure, missing dependency, failing assertion, out of memory, network timeout).
                - **Trigger Point**: Identify the exact command, step, or process that exited with failure.
                
                ### 📦 Affected Component & Environment
                - File, module, package, or pipeline stage affected.
                - Tooling / versions involved if visible in the log.
                
                ### 🛠️ Suggested Fix
                - Provide clear step-by-step instructions to fix the issue.
                - Include exact code snippets, configuration diffs, or shell commands to resolve the failure.
                
                ### 🛡️ Prevention Tips
                - Actionable best practices to prevent similar pipeline failures in the future (e.g. dependency pinning, pre-commit hooks, local test reproduction commands, increased timeouts/resources).
                
                Be concise, authoritative, and direct. Focus on actionable fixes over verbose theory.
                """;
    }

    public String userPrompt(String logContent) {
        return """
                Please analyze the following CI/CD or build failure log:
                
                ```text
                %s
                ```
                """.formatted(logContent);
    }
}
