package com.meditrack.consultation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConsultationRepository extends JpaRepository<ConsultationRecord, Long> {

    @Query("""
            select c from ConsultationRecord c
            where c.appointment.patient.id = :patientId
            order by c.createdAt desc
            """)
    List<ConsultationRecord> timelineByPatient(@Param("patientId") Long patientId);

    @Query("""
            select c from ConsultationRecord c
            where lower(c.diagnosis) like lower(concat('%', :q, '%'))
               or lower(coalesce(c.notes, '')) like lower(concat('%', :q, '%'))
               or lower(coalesce(c.prescription, '')) like lower(concat('%', :q, '%'))
            order by c.createdAt desc
            """)
    List<ConsultationRecord> searchForAdmin(@Param("q") String q);

    @Query("""
            select c.diagnosis, count(c.id)
            from ConsultationRecord c
            group by c.diagnosis
            order by count(c.id) desc
            """)
    List<Object[]> commonDiagnoses();
}
