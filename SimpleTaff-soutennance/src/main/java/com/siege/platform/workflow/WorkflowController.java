package com.siege.platform.workflow;

import com.siege.platform.common.CurrentTenantService;
import com.siege.platform.common.IdempotencyManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/workflows")
@PreAuthorize("hasAnyRole('ADMIN_ENTREPRISE', 'SUPER_ADMIN')")
public class WorkflowController {
    private final WorkflowDefinitionRepository repository;
    private final CurrentTenantService tenantService;
    private final IdempotencyManager idempotencyManager;

    public WorkflowController(WorkflowDefinitionRepository repository, CurrentTenantService tenantService,
                              IdempotencyManager idempotencyManager) {
        this.repository = repository;
        this.tenantService = tenantService;
        this.idempotencyManager = idempotencyManager;
    }

    @GetMapping
    public List<WorkflowDefinition> list() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader,
                                  @RequestBody WorkflowDefinition workflow) {
        String idempotencyKey = idempotencyHeader;
        if (idempotencyKey != null && !idempotencyKey.isBlank() && idempotencyManager.has(idempotencyKey)) {
            return ResponseEntity.ok(idempotencyManager.get(idempotencyKey));
        }
        workflow.setEntreprise(tenantService.entreprise());
        WorkflowDefinition saved = repository.save(workflow);
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyManager.put(idempotencyKey, saved);
        }
        return ResponseEntity.ok(saved);
    }
}
