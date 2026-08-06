package com.siege.platform.workflow;

import com.siege.platform.common.CurrentTenantService;
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

    public WorkflowController(WorkflowDefinitionRepository repository, CurrentTenantService tenantService) {
        this.repository = repository;
        this.tenantService = tenantService;
    }

    @GetMapping
    public List<WorkflowDefinition> list() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> save(@RequestBody WorkflowDefinition workflow) {
        workflow.setEntreprise(tenantService.entreprise());
        return ResponseEntity.ok(repository.save(workflow));
    }
}
