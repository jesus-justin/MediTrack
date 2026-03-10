package com.meditrack.doctor;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String specialization;

    @Column(nullable = false)
    private String department;

    // Simplified weekly schedule string. Can be replaced with a dedicated schedule table.
    @Column(length = 1000)
    private String schedule;

    @Column(nullable = false)
    private boolean active;

    @PrePersist
    void prePersist() {
        if (!active) {
            active = true;
        }
    }
}
