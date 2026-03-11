package com.meditrack.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminPanelController {

    private final AdminPanelService adminPanelService;

    @GetMapping("/search")
    public AdminPanelDtos.SearchResponse search(@RequestParam String q) {
        return adminPanelService.advancedSearch(q);
    }

    @GetMapping("/audit")
    public List<AdminPanelDtos.AuditEntryResponse> audit(@RequestParam(defaultValue = "20") int limit) {
        return adminPanelService.recentAudit(limit);
    }

    @GetMapping("/reports/summary")
    public AdminPanelDtos.ReportsSummaryResponse reportsSummary() {
        return adminPanelService.reportsSummary();
    }

    @GetMapping("/reports/summary.csv")
    public ResponseEntity<String> reportsSummaryCsv() {
        AdminPanelDtos.ReportsSummaryResponse report = adminPanelService.reportsSummary();

        StringBuilder csv = new StringBuilder();
        csv.append("section,key,value\n");
        appendSection(csv, "overview", report.overview());
        appendSection(csv, "operations", report.operations());
        appendSection(csv, "security", report.security());
        appendSection(csv, "integrity", report.integrity());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=admin-report-summary.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }

    @PostMapping("/workflows/run-maintenance")
    public AdminPanelDtos.WorkflowRunResponse runMaintenanceWorkflow(Authentication authentication) {
        return adminPanelService.runMaintenanceWorkflow(authentication.getName());
    }

    private void appendSection(StringBuilder csv, String section, Map<String, Object> values) {
        for (Map.Entry<String, Object> entry : values.entrySet()) {
            csv.append(section)
                    .append(',')
                    .append(entry.getKey())
                    .append(',')
                    .append('"').append(String.valueOf(entry.getValue()).replace("\"", "\"\"")).append('"')
                    .append('\n');
        }
    }
}
