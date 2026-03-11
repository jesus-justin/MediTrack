package com.meditrack.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminAuditService {

    private final AdminAuditLogRepository adminAuditLogRepository;

    public void record(String actorUsername, String action, String targetType, String targetId, String details) {
        AdminAuditLog entry = AdminAuditLog.builder()
                .actorUsername(actorUsername == null || actorUsername.isBlank() ? "system" : actorUsername)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .details(details)
                .build();
        adminAuditLogRepository.save(entry);
    }

    public List<AdminAuditLog> listRecent(int limit) {
        int safeLimit = Math.max(1, Math.min(100, limit));
        return adminAuditLogRepository.findTop200ByOrderByCreatedAtDesc()
                .stream()
                .limit(safeLimit)
                .toList();
    }
}
