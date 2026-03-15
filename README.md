# MediTrack
Full-featured hospital workflow platform for managing the patient journey end-to-end, from registration to discharge-ready clinical records, with built-in analytics.

## What Is Included
- `backend`: Java 21 + Spring Boot + Spring Security (JWT) + JPA (MySQL-ready)
- `frontend`: React + Vite + Chart.js dashboard
- Role-based access model: `ADMIN`, `RECEPTIONIST`, `DOCTOR`, `PATIENT`
- Core modules: patients, doctors/staff, appointments, consultations (EMR), analytics, notifications stubs

## System Modules
1. Patient Management
- Patient registration with demographics, medical history, insurance fields
- Unique Patient ID generation (`PT-YYYYMMDD-XXXX`)
- Search and profile retrieval APIs

2. Appointment Scheduling
- Book and reschedule appointments
- Conflict detection to prevent doctor double-booking
- Status flow: `PENDING -> CONFIRMED -> COMPLETED` (+ `CANCELED`)

3. Doctor & Staff Management
- Doctor profiles with specialization and department
- Schedule field for shift/work window representation
- Workload overview endpoint by doctor

4. Consultation & Medical Records
- Record diagnosis, prescriptions, and visit notes
- Attachment URL support (for lab report/doc references)
- Patient medical timeline endpoint

5. Analytics Dashboard
- Appointment trends over time
- Most common diagnoses
- Doctor utilization
- Patient demographics (gender, location, age bands)
- Peak-hour heatmap data

6. Notifications & Alerts
- Reminder/alert API stubs included
- Ready for integration with scheduled jobs + SMS/email gateway

## Project Structure
```text
MediTrack/
	backend/
		pom.xml
		src/main/java/com/meditrack/
			analytics/
			appointment/
			auth/
			common/
			config/
			consultation/
			doctor/
			patient/
			security/
		src/main/resources/application.yml
	frontend/
		package.json
		src/
			components/
			pages/
			services/api.js
```

## Run Locally
## Prerequisites
- Java 21
- Maven 3.9+
- MySQL 8+
- Node.js 18+

## Backend
Optional: import the prepared schema first:
```bash
mysql -u root -p < database/meditrack_mysql.sql
```

1. Create/update MySQL credentials if needed in `backend/src/main/resources/application.yml`
2. Run:
```bash
cd backend
mvn spring-boot:run
```
3. API base URL: `http://localhost:8081/api`

Default seeded admin account:
- Username: `admin`
- Password: `Admin@123`

## Frontend
1. Run:
```bash
cd frontend
npm install
npm run dev
```
2. App URL: `http://localhost:5173`

Note for Windows PowerShell with script policy restrictions:
- Use `npm.cmd install` and `npm.cmd run dev`

## After Restart (Windows Quick Start)
When you shut down your device, backend and frontend processes stop. After reopening the project, use one of these options to start everything again:

1. Ensure MySQL is running (for example via XAMPP MySQL service on port `3306`).
2. Double-click `start-meditrack.bat` in the project root.
3. Or run in PowerShell from project root:
```powershell
./start-meditrack.ps1
```

This opens two terminals:
- Backend: `http://localhost:8081/api`
- Frontend: `http://localhost:5173`

You can also use VS Code task `MediTrack Start All` from **Terminal -> Run Task**.

## Permanent Fix: Auto-Start MediTrack After Login (Windows)
To prevent the recurring "Cannot reach server" error after reboot, install the built-in scheduled auto-start task once:

```powershell
./install-meditrack-autostart.ps1
```

What this does:
- Creates a Windows Scheduled Task named `MediTrack Auto Start`
- Automatically runs `start-meditrack.ps1` every time you sign in
- Adds a short startup delay so services can initialize cleanly
- If Scheduled Task creation is not permitted on your account, it falls back to a Startup-folder launcher (no admin needed)

To remove auto-start later:

```powershell
./remove-meditrack-autostart.ps1
```

Notes:
- Keep MySQL (XAMPP) installed/runnable on port `3306`
- The launcher now attempts to start common MySQL service names automatically and waits for readiness
- Login now retries while backend is warming up, reducing startup race failures

## Key API Endpoints
- Auth: `POST /api/auth/login`
- Patients: `GET/POST/PUT /api/patients`
- Doctors: `GET/POST/PUT /api/doctors`, `GET /api/doctors/workload`
- Appointments: `GET/POST/PUT /api/appointments`, `PATCH /api/appointments/{id}/status`
- Consultations: `POST /api/consultations/{appointmentId}`, `GET /api/consultations/timeline/{patientId}`
- Analytics: `GET /api/analytics/dashboard`
- Notifications: `GET /api/notifications/doctor-upcoming`, `GET /api/notifications/patient-reminders`

## Security Model
- JWT bearer token authentication
- Method-level role protection via `@PreAuthorize`
- CORS configured for frontend dev ports

## Patient AI Chatbot Setup (Gemini)
The patient dashboard chatbot uses a backend proxy endpoint, so your Gemini API key is never exposed in frontend JavaScript.

1. Set a backend environment variable before starting Spring Boot:
```powershell
$env:GEMINI_API_KEY="your_gemini_api_key"
```
2. Start backend and frontend as usual.
3. Login as a patient-role account and open the dashboard.

Implementation details:
- Backend endpoint: `POST /api/patient-chatbot/message`
- Frontend never stores the key in `.env` client variables.

## Suggested 4-Month Extension Plan
1. Month 1
- Harden auth (refresh tokens, password policies, audit logs)
- Add validation and DTO mapping layer

2. Month 2
- Calendar UI with drag-drop rescheduling
- Doctor availability model with recurring slots

3. Month 3
- File upload service (S3/MinIO/local)
- Notification scheduler (email/SMS/WhatsApp integration)

4. Month 4
- Advanced analytics (weekly/monthly trends, cohort views)
- Deployment (Docker + CI/CD + cloud hosting)

## Resume Value Highlights
- Enterprise backend stack (`Java + Spring Boot + Security + JPA`)
- Role-based access control in a real healthcare domain
- Workflow complexity across multiple user roles
- Business analytics dashboard tied to operational data
- Full-stack architecture with APIs + interactive frontend
