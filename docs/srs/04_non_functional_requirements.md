# Non-Functional Requirements (NFRs)

* **NFR-01 (Security):** All data in transit must utilize TLS 1.2+ with strict certificate pinning enforced within the lockdown client.
* **NFR-02 (Authorization):** Role-Based Access Control (RBAC) must be explicitly enforced at the API routing layer on every request to mitigate vertical/horizontal privilege escalation.
* **NFR-03 (Performance):** The system shall support concurrent, independent exam sessions with a 99th-percentile question-load latency of <2.0 seconds.
* **NFR-04 (Reliability):** The core application and WebSockets must maintain 99.9% uptime during defined scheduled exam windows.
* **NFR-05 (Compliance & Privacy):** Biometric and recording data retention policies must be fully consented to prior to entry; all access to these recordings must be strictly audited.
* **NFR-06 (Scalability):** Video ingestion and WebSocket signaling servers must dynamically scale based on active `exam_id` schedules.