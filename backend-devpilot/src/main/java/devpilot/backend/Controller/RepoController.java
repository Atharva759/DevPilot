package devpilot.backend.Controller;

import devpilot.backend.Entity.Repository;
import devpilot.backend.Security.CurrentUser;
import devpilot.backend.Services.RepoService;
import devpilot.backend.Services.indexing.IndexingService;
import devpilot.backend.dto.IndexStatusResponse;
import devpilot.backend.dto.RepositoryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/repos")
@RequiredArgsConstructor
public class RepoController {

    private final CurrentUser currentUser;
    private final RepoService repoService;
    private final IndexingService indexingService;

    @GetMapping
    public List<RepositoryResponse> list(
            @RequestParam(name="refresh", defaultValue = "true") boolean refresh
    ){
        UUID userId = currentUser.require().getId();
        if(refresh){
            return repoService.syncAndListRepos(userId);
        }
        return repoService.listStored(userId);
    }

    @GetMapping("/{id}")
    public RepositoryResponse get(
            @PathVariable  UUID id
    ){
        UUID userId = currentUser.require().getId();
        return repoService.toResponse(repoService.requireOwned(id,userId));
    }

    @GetMapping("/{id}/status")
    public IndexStatusResponse status(@PathVariable UUID id){
        UUID userId = currentUser.require().getId();
        return repoService.status(id,userId);
    }

    @PostMapping("/{id}/index")
    public ResponseEntity<RepositoryResponse> index(@PathVariable UUID id){
        UUID userId = currentUser.require().getId();
        Repository repo = indexingService.startIndexing(id,userId);
        indexingService.indexAsync(id,userId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(repoService.toResponse(repo));
    }
}
