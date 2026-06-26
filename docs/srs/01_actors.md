# System Actors
**Document Maintainer:** M. Khubaib Asif

This document defines the primary human and machine actors interacting with the Online Exam Platform.

| Actor | Description |
| :--- | :--- |
| **Super Admin** | Manages institutions, global configurations, and high-level security policies |
| **Institution Admin** | Manages teachers, students, and classes within one specific institution |
| **Teacher** | Authors exams, monitors live sessions, and grades subjective answers |
| **Approver** *(Optional)* | Reviews and digitally signs/approves high-stakes exams before publishing |
| **Student** | Takes assigned exams only, restricted to their specific enrollment scope |
| **Proctor** | Reviews AI-flagged sessions or live-monitors active exam sessions |
| **System/AI Engine** *(Machine)* | Background processor handling real-time video/audio analysis, anomaly detection, auto-grading, and system log sanitization |