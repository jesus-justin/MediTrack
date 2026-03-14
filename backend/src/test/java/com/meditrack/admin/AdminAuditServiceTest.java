package com.meditrack.admin;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAuditServiceTest {

    @Mock
    private AdminAuditLogRepository adminAuditLogRepository;

    @InjectMocks
    private AdminAuditService adminAuditService;

    private AdminAuditLog stubLog(String actor) {
        return AdminAuditLog.builder()
                .actorUsername(actor).action("TEST")
                .targetType("X").details("details")
                .build();
    }

    @Test
    void record_savesEntryWithCorrectFields() {
        ArgumentCaptor<AdminAuditLog> captor = ArgumentCaptor.forClass(AdminAuditLog.class);

        adminAuditService.record("alice", "CREATE_USER", "USER", "42", "info");

        verify(adminAuditLogRepository).save(captor.capture());
        AdminAuditLog saved = captor.getValue();
        assertEquals("alice", saved.getActorUsername());
        assertEquals("CREATE_USER", saved.getAction());
        assertEquals("USER", saved.getTargetType());
        assertEquals("42", saved.getTargetId());
        assertEquals("info", saved.getDetails());
    }

    @Test
    void record_nullActor_savesAsSystem() {
        ArgumentCaptor<AdminAuditLog> captor = ArgumentCaptor.forClass(AdminAuditLog.class);

        adminAuditService.record(null, "BOOT", "APP", null, "started");

        verify(adminAuditLogRepository).save(captor.capture());
        assertEquals("system", captor.getValue().getActorUsername());
    }

    @Test
    void record_blankActor_savesAsSystem() {
        ArgumentCaptor<AdminAuditLog> captor = ArgumentCaptor.forClass(AdminAuditLog.class);

        adminAuditService.record("   ", "BOOT", "APP", null, "started");

        verify(adminAuditLogRepository).save(captor.capture());
        assertEquals("system", captor.getValue().getActorUsername());
    }

    @Test
    void listRecent_limitsToRequestedCount() {
        // Repository returns 200 entries; requesting only 5
        List<AdminAuditLog> all200 = IntStream.range(0, 200)
                .mapToObj(i -> stubLog("user" + i))
                .toList();
        when(adminAuditLogRepository.findTop200ByOrderByCreatedAtDesc()).thenReturn(all200);

        List<AdminAuditLog> result = adminAuditService.listRecent(5);

        assertEquals(5, result.size());
    }

    @Test
    void listRecent_clampsBelowOne() {
        // Limit of 0 should be clamped to 1
        List<AdminAuditLog> all200 = IntStream.range(0, 200)
                .mapToObj(i -> stubLog("user" + i))
                .toList();
        when(adminAuditLogRepository.findTop200ByOrderByCreatedAtDesc()).thenReturn(all200);

        List<AdminAuditLog> result = adminAuditService.listRecent(0);

        assertEquals(1, result.size());
    }

    @Test
    void listRecent_clampsAbove100() {
        // Limit of 150 should be clamped to 100
        List<AdminAuditLog> all200 = IntStream.range(0, 200)
                .mapToObj(i -> stubLog("user" + i))
                .toList();
        when(adminAuditLogRepository.findTop200ByOrderByCreatedAtDesc()).thenReturn(all200);

        List<AdminAuditLog> result = adminAuditService.listRecent(150);

        assertEquals(100, result.size());
    }
}
