package com.meditrack.admin;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class AdminPanelDtos {

    public record SearchItem(
            String type,
            Long id,
            String title,
            String subtitle,
            String status,
            String meta
    ) {
    }

    public record SearchResponse(
            String query,
            int total,
            Map<String, List<SearchItem>> groups
    ) {
    }

    public record AuditEntryResponse(
            Long id,
            String actorUsername,
            String action,
            String targetType,
            String targetId,
            String details,
            LocalDateTime createdAt
    ) {
    }

    public record ReportsSummaryResponse(
            LocalDateTime generatedAt,
            Map<String, Object> overview,
            Map<String, Object> operations,
            Map<String, Object> security,
            Map<String, Object> integrity
    ) {
    }

    public record WorkflowRunResponse(
            String workflow,
            LocalDateTime executedAt,
            int stalePendingCanceled,
            long unresolvedCompletedAppointments,
            long orphanPatients,
            long idleDoctors,
            String message
    ) {
    }
}
