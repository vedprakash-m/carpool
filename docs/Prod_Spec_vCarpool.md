# **Product Requirement & Specification Document: Carpool Management Web Application**

## **1. Introduction**

This document outlines the foundational structure, core components, and functional requirements for a cost-efficient, full-stack carpool management web application. The primary goal is to create a streamlined and automated system for scheduling and managing carpools for a community of parents and students.

The application will be built with a **mobile-first design philosophy** for its web frontend, ensuring an optimal user experience on any device. The backend API is designed from the ground up to be efficiently consumed by a future native iPhone application. The system supports three user roles—**Admin**, **Parent**, and **Student**—each with a distinct set of permissions and capabilities.

This document details all aspects of the project, including the technology stack, data models, core features, and non-functional requirements.

---

## **2. User Roles & Permissions**

The application will enforce a strict Role-Based Access Control (RBAC) system to manage user capabilities.

- ### **Admin**

  - **Description:** The superuser with complete control over the application.
  - **Permissions:**
    - Create, view, update, and delete any user account (**Parent** or **Student**).
    - **Set initial passwords** for newly created user accounts.
    - Define and manage weekly carpool schedule templates and their slots.
    - Designate which parents are "Active Drivers."
    - Initiate the automated schedule generation process.
    - Manually override any generated ride assignments.
    - View all system data, including user profiles, historical assignments, and swap requests.
    - Change their own password.

- ### **Parent**

  - **Description:** A user who is a parent or guardian of a student. Can be designated as a driver.
  - **Permissions:**
    - Manage their own profile and their associated children's profiles.
    - View the carpool schedule for themselves and their children.
    - **Change their own password** after logging in.
    - If designated as an **Active Driver**:
      - Submit weekly driving availability and preferences (**Preferable**, **Less-Preferable**, **Unavailable**).
    - Initiate, accept, or decline ride swap requests with other parents.

- ### **Student**
  - **Description:** A user who is a passenger in the carpool system.
  - **Permissions:**
    - View their personal upcoming carpool schedule.
    - Manage their own limited profile (e.g., phone number).
    - **Change their own password** after logging in.

---

## **3. Core Features & Functionality**

### **3.1. User Authentication & Account Management**

- **Admin User Creation:** Admins can create new **Parent** and **Student** accounts via a dedicated UI. This process includes setting an initial password to simplify user onboarding.
- **Self-Registration (Optional):** The system can support a public-facing registration page for new Parents and Students if desired.
- **Secure Login:** All users log in using an email and password. The system provides a secure, stateless JWT upon successful authentication.
- **User Password Change:** Any authenticated user can change their own password from their profile/settings page by providing their current password and a new one.

### **3.2. Carpool Scheduling & Management**

- **Admin Schedule Template Creation:** Admins have the tools to create multiple, distinct carpool events (slots) for any day of the week. These slots support flexible route types, such as multi-stop school runs or direct point-to-point trips.
- **Driver Availability Submission:** Driving parents can submit their weekly availability. The UI will enforce the following limits per week:
  - Up to 3 **Preferable** slots.
  - Up to 2 **Less-Preferable** slots.
  - Up to 2 **Unavailable** slots.
  - Any slot not explicitly marked is treated as **Available (Neutral)**.
- **Automated Schedule Generation:** An admin-triggered process that generates the weekly ride assignments based on a multi-step algorithm:
  1.  **Exclusion:** Strictly avoids assigning parents to slots they marked as **Unavailable**.
  2.  **Preference Optimization:** Prioritizes assigning drivers to their **Preferable** slots first.
  3.  **Secondary Optimization:** Utilizes **Less-Preferable** slots for remaining assignments.
  4.  **Neutral Fulfillment:** Fills any remaining needs using **Available (Neutral)** slots.
  5.  **Historical Tie-Breaking & Gap Filling:** For any slots that remain unassigned or to ensure fair distribution during ties, the system analyzes **historical ride assignment data** to make equitable decisions.
- **Persistent Storage:** All final ride assignments are persistently stored in the database to facilitate historical analysis.
- **Swap Requests:** Parents can request to swap an assigned ride with another driver. The system manages the request and notification flow.

---

## **4. 🛠️ Technical Specifications**

### **4.1. Technology Stack**

- **Backend:** Next.js with App Router for building a high-performance, modern API.
- **Database:** **Azure Cosmos DB** (Serverless model) for a scalable and cost-effective NoSQL data store.
- **Frontend:** **Next.js (React)** for a performant, server-rendered web application, styled with **Tailwind CSS**. State management will be handled by **Zustand**.
- **Authentication:** Email/password authentication with RBAC, generating a secure, stateless **JWT**.
- **Hosting:**
  - **Frontend:** **Azure Static Web Apps** for global distribution and seamless CI/CD integration.
  - **Backend:** **Azure Functions** or **Azure Container Apps** (Consumption Plan) for a serverless, scalable API deployment.
- **Security:** **Azure Key Vault** for secure secret management and **Managed Identities** for passwordless service authentication.
- **Version Control & CI/CD:** **Git** repository hosted on **GitHub**, with basic CI/CD workflows established via **GitHub Actions**.

### **4.2. Core Data Models**

All date/time fields will be handled as ISO 8601 strings and processed in UTC on the backend.

| Model                          | Fields                                                                                                      | Description                                                                                                |
| :----------------------------- | :---------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| **User**                       | `id`, `email`, `hashed_password`, `full_name`, `role`, `phone_number`, `is_active_driver`, `home_address`   | Represents any user of the system (Admin, Parent, Student).                                                |
| **Child**                      | `id`, `parent_id`, `full_name`, `student_id`                                                                | Represents a student linked to a Parent account.                                                           |
| **Location**                   | `id`, `name`, `address`                                                                                     | Represents a physical location for pickups or drop-offs.                                                   |
| **WeeklyScheduleTemplateSlot** | `id`, `day_of_week`, `start_time`, `end_time`, `route_type`, `description`                                  | Defines a recurring carpool slot created by an Admin.                                                      |
| **DriverWeeklyPreference**     | `id`, `driver_parent_id`, `week_start_date`, `template_slot_id`, `preference_level`, `submission_timestamp` | Records a driver's preference for a specific slot in a specific week. Absence implies 'AVAILABLE_NEUTRAL'. |
| **RideAssignment**             | `id`, `slot_id`, `driver_id`, `date`, `passengers`, `assignment_method`                                     | A specific, scheduled ride with an assigned driver and passengers.                                         |
| **SwapRequest**                | `id`, `original_ride_id`, `requesting_driver_id`, `receiving_driver_id`, `status`                           | Manages the state of a ride swap request between two drivers.                                              |

### **4.3. Backend API Design (FastAPI)**

The API will be RESTful, versioned under `/api/v1/`, and self-documented via OpenAPI.

| Endpoint                             | Method   | Description                                                            | RBAC     |
| :----------------------------------- | :------- | :--------------------------------------------------------------------- | :------- |
| `/api/v1/auth/token`                 | **POST** | Authenticates a user and returns a JWT.                                | Public   |
| `/api/v1/users/me`                   | **GET**  | Gets the profile of the currently authenticated user.                  | Any Auth |
| `/api/v1/users/me/password`          | **PUT**  | Allows the authenticated user to change their own password.            | Any Auth |
| `/api/v1/admin/users`                | **POST** | Creates a new Parent or Student user with an initial password.         | Admin    |
| `/api/v1/admin/generate-schedule`    | **POST** | Triggers the automated schedule generation for a given week.           | Admin    |
| `/api/v1/parents/weekly-preferences` | **POST** | Submits the weekly driving preferences for the authenticated parent.   | Parent   |
| `/api/v1/parents/weekly-preferences` | **GET**  | Retrieves the weekly driving preferences for the authenticated parent. | Parent   |

---

## **5. Frontend UI Additions (Next.js)**

- **Admin User Creation UI:** A new view within the Admin Dashboard will feature a form for creating new users. The form will include fields for email, name, role selection (Parent/Student), and initial password. This UI will interact directly with the `POST /api/v1/admin/users` endpoint.
- **User Change Password UI:** A dedicated form within every user's profile/settings page. It will contain fields for "Current Password," "New Password," and "Confirm New Password," calling the `PUT /api/v1/users/me/password` endpoint upon submission.

## **6. Non-Functional Requirements**

- **Security:** Implement standard security best practices, including input validation, output encoding, and prevention of common vulnerabilities (XSS, CSRF, SQLi). Use HTTPS for all traffic.
- **Error Handling:** Provide clear, user-friendly error messages on the frontend while logging detailed technical errors on the backend for debugging.
- **Monitoring & Logging:** Integrate the FastAPI backend with **Azure Monitor Application Insights** (free tier) to track performance, requests, and errors.
- **Testing:** Develop unit tests for critical business logic in the backend, with a particular focus on the authentication flow, new user management features, and the schedule generation algorithm.
- **Documentation:** Maintain up-to-date API documentation using FastAPI's automatic OpenAPI/Swagger UI generation. Code will be well-commented to explain complex logic.
