package com.meditrack.patient;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;

    @InjectMocks
    private PatientService patientService;

    private Patient newPatient() {
        return Patient.builder()
                .firstName("John").lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .gender("Male")
                .build();
    }

    @Test
    void create_generatesPatientCodeAndSaves() {
        Patient incoming = newPatient();
        when(patientRepository.existsByPatientCode(any())).thenReturn(false);
        when(patientRepository.save(any())).thenAnswer(inv -> {
            Patient p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        Patient result = patientService.create(incoming);

        assertNotNull(result.getPatientCode());
        assertTrue(result.getPatientCode().startsWith("PT-"));
        verify(patientRepository).save(incoming);
    }

    @Test
    void create_retryUntilUniqueCode() {
        // First code attempt collides; second is accepted
        Patient incoming = newPatient();
        when(patientRepository.existsByPatientCode(any()))
                .thenReturn(true)   // first attempt: code taken
                .thenReturn(false); // second attempt: free
        when(patientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Patient result = patientService.create(incoming);

        assertNotNull(result.getPatientCode());
        verify(patientRepository, times(2)).existsByPatientCode(any());
    }

    @Test
    void get_found_returnsPatient() {
        Patient patient = newPatient();
        patient.setId(1L);
        when(patientRepository.findById(1L)).thenReturn(Optional.of(patient));

        Patient result = patientService.get(1L);

        assertEquals(1L, result.getId());
    }

    @Test
    void get_notFound_throws() {
        when(patientRepository.findById(99L)).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> patientService.get(99L));
        assertEquals("Patient not found", ex.getMessage());
    }

    @Test
    void list_nullQuery_returnsAll() {
        when(patientRepository.findAll()).thenReturn(List.of(newPatient()));

        List<Patient> result = patientService.list(null);

        assertEquals(1, result.size());
        verify(patientRepository).findAll();
        verify(patientRepository, never())
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(
                        any(), any(), any());
    }

    @Test
    void list_withQuery_callsSearchMethod() {
        String q = "john";
        when(patientRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCaseOrPatientCodeContainingIgnoreCase(
                q, q, q)).thenReturn(List.of(newPatient()));

        List<Patient> result = patientService.list(q);

        assertEquals(1, result.size());
        verify(patientRepository, never()).findAll();
    }
}
