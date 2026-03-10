package com.meditrack.appointment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @Query("""
            select case when count(a) > 0 then true else false end
            from Appointment a
            where a.doctor.id = :doctorId
              and a.id <> coalesce(:appointmentId, -1)
              and a.status <> com.meditrack.appointment.AppointmentStatus.CANCELED
              and a.startTime < :endTime
              and a.endTime > :startTime
            """)
    boolean hasConflict(@Param("doctorId") Long doctorId,
                        @Param("startTime") LocalDateTime startTime,
                        @Param("endTime") LocalDateTime endTime,
                        @Param("appointmentId") Long appointmentId);

    @Query("""
            select d.id, d.fullName, count(a.id)
            from Appointment a join a.doctor d
            where a.status <> com.meditrack.appointment.AppointmentStatus.CANCELED
            group by d.id, d.fullName
            order by count(a.id) desc
            """)
    List<Object[]> countAppointmentsPerDoctor();

    @Query("""
            select function('date_format', a.startTime, '%Y-%m-%d'), count(a.id)
            from Appointment a
            group by function('date_format', a.startTime, '%Y-%m-%d')
            order by function('date_format', a.startTime, '%Y-%m-%d')
            """)
    List<Object[]> appointmentTrendDaily();

    @Query("""
            select hour(a.startTime), count(a.id)
            from Appointment a
            group by hour(a.startTime)
            order by hour(a.startTime)
            """)
    List<Object[]> peakHourHeatmap();
}
