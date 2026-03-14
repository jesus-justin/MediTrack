# Upgrade Plan: MediTrack Backend (20260314123419)

- **Generated**: 2026-03-14 20:37:30 +08:00
- **HEAD Branch**: main
- **HEAD Commit ID**: 329cc7a

## Available Tools

**JDKs**
- JDK 17.0.18: C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot\bin (used by Step 2)
- JDK 21: **<TO_BE_INSTALLED>** (required by Step 1 and Step 4)

**Build Tools**
- Maven 3.9.12: C:\maven\apache-maven-3.9.12\bin
- Maven Wrapper: Not present in backend root

## Guidelines

- Upgrade Java runtime to LTS Java 21.

## Options

- Working branch: appmod/java-upgrade-20260314123419
- Run tests before and after the upgrade: true

## Upgrade Goals

- Upgrade Java from 17 to 21.

### Technology Stack

| Technology/Dependency | Current | Min Compatible | Why Incompatible |
| --------------------- | ------- | -------------- | ---------------- |
| Java | 17 | 21 | User requested Java 21 LTS runtime. |
| Spring Boot | 3.3.2 | 3.3.2 | Already compatible with Java 21. |
| Spring Framework | 6.1.x (managed by Spring Boot 3.3.2) | 6.1.x | Already compatible with Java 21. |
| Hibernate ORM | 6.5.x (managed by Spring Boot 3.3.2) | 6.5.x | Already compatible with Java 21. |
| MySQL Connector/J | Managed by Spring Boot 3.3.2 | Managed by Spring Boot 3.3.2 | Already compatible with Java 21. |

### Derived Upgrades

- Update Maven Java target level from 17 to 21 by changing the `java.version` property in `pom.xml`.

## Upgrade Steps

- **Step 1: Setup Environment**
  - **Rationale**: JDK 21 is required for compilation and runtime validation and is not currently available.
  - **Changes to Make**:
    - [ ] Install JDK 21.
    - [ ] Verify JDK 17 and JDK 21 are both discoverable.
    - [ ] Verify Maven executable availability.
  - **Verification**:
    - Command: `#list_jdks` and `#list_mavens`
    - Expected: JDK 17 + JDK 21 and Maven are available.

- **Step 2: Setup Baseline**
  - **Rationale**: Capture pre-upgrade compile/test behavior for acceptance comparison.
  - **Changes to Make**:
    - [ ] Run baseline compile for main and test code using JDK 17.
    - [ ] Run baseline tests using JDK 17.
    - [ ] Record pass/fail and test pass count in progress log.
  - **Verification**:
    - Command: `mvn clean test-compile -q` and `mvn clean test -q`
    - JDK: C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot
    - Expected: Baseline compile and tests recorded.

- **Step 3: Upgrade Java Target to 21**
  - **Rationale**: Apply the required project change for Java 21 compatibility.
  - **Changes to Make**:
    - [ ] Update `java.version` from `17` to `21` in `pom.xml`.
    - [ ] Keep Spring Boot and dependency set unchanged unless compatibility issues appear.
    - [ ] Resolve any compile errors introduced by language/runtime level change.
  - **Verification**:
    - Command: `mvn clean test-compile -q`
    - JDK: installed JDK 21 path from Step 1
    - Expected: Main and test code compile successfully.

- **Step 4: Final Validation**
  - **Rationale**: Confirm goal completion and full build quality on target runtime.
  - **Changes to Make**:
    - [ ] Verify Java target and effective runtime are 21.
    - [ ] Run clean compile and full test suite on JDK 21.
    - [ ] Fix any remaining compile/test failures until acceptance criteria are met.
  - **Verification**:
    - Command: `mvn clean test -q`
    - JDK: installed JDK 21 path from Step 1
    - Expected: Compilation success and 100% tests pass.

## Key Challenges

- **JDK Switching Consistency on Windows**
  - **Challenge**: Multiple JDKs on PATH can cause Maven to run with an unintended runtime.
  - **Strategy**: Set `JAVA_HOME` explicitly per step before each Maven verification command.

- **No Maven Wrapper in Repository**
  - **Challenge**: Build depends on machine-level Maven installation consistency.
  - **Strategy**: Use detected Maven 3.9.12 path directly and verify version before build runs.
