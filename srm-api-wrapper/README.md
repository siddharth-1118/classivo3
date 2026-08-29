# SRMIST Student Portal API Wrapper Prototype

A complete, local-only, database-free Node.js/TypeScript API wrapper around the official SRMIST Student Portal (`https://sp.srmist.edu.in/`). It implements isolated browser sessions using Playwright on the backend, and is accompanied by a modern React/Vite/TypeScript companion dashboard.

---

## 1. Requirements & Node.js Version
- **Node.js**: `v18.x` or higher (tested on `v20.x` and `v24.x`).
- **NPM**: `v9.x` or higher.
- **Operating System**: Windows / Linux / macOS (Playwright handles browser bindings across platforms).

---

## 2. Installation & Setup

Clone/navigate to the `srm-api-wrapper` directory:

### Step A: Backend Installation
1. Navigate to the backend directory:
   ```bash
   cd srm-api-wrapper/backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Install the Playwright Chromium browser binaries:
   ```bash
   npx playwright install chromium
   ```
4. Setup environment variables:
   Copy `.env.example` to `.env` (it is pre-configured for local defaults):
   ```bash
   copy .env.example .env
   ```

### Step B: Frontend Installation
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

---

## 3. How to Start the Application

You will run the backend server and frontend development server simultaneously.

### Start the Backend API Server
Navigate to `srm-api-wrapper/backend` and run:
```bash
npm run dev
```
The backend API server will boot on **`http://localhost:5000`**.

### Start the Frontend Dev Server
Navigate to `srm-api-wrapper/frontend` and run:
```bash
npm run dev
```
The frontend application will start on **`http://localhost:5173`**. Open this URL in your web browser.

---

## 4. Local URLs & Routing
- **Frontend Dashboard / Login**: `http://localhost:5173/`
- **Backend API Base**: `http://localhost:5000`
- **Vite Proxy configuration**: All `/api/*` requests on the frontend are automatically proxied to the backend at `http://localhost:5000/api/*` to bypass CORS issues.

---

## 5. Security & Session Architecture

```
Student Browser (React) 
     |
     | [UUID Session Token via X-Session-ID Header]
     v
Express API Backend (In-Memory Map)
     |
     | [Isolated Playwright Page & Context]
     v
Live SRMIST Student Portal (https://sp.srmist.edu.in)
```

1. **In-Memory Store**: We do NOT use any database. Sessions are stored in a transient `Map<string, SRMSession>` on the backend. Restarting the backend clears all active contexts.
2. **Session Identification**: A cryptographically secure random 32-byte hexadecimal string is generated as the `sessionId`. The student's NetID or password is never used as a session key.
3. **HTTP Header Security**: The frontend communicates using the custom header `X-Session-ID`. Session cookies and internal SRM portal authorization state tokens are held strictly inside the backend Playwright `BrowserContext` and are **never** returned or exposed to the client.
4. **Credential Isolation**: Student credentials (NetID, password) and CAPTCHA answers are processed immediately in-memory by Playwright form inputs and never written to files, console output, or telemetry logs.
5. **Session Expiration Sweep**: An automated sweeper sweeps the active session list every 30 seconds. Sessions with inactivity exceeding `SESSION_TIMEOUT_MINUTES` (default 20 mins) are automatically destroyed (closing their respective browser contexts and tab pages).

---

## 6. CAPTCHA & Authentication Flow

1. **Session Initialisation**: Opening the app calls `POST /api/auth/start`. The backend spawns a Playwright `BrowserContext`, loads the official portal login page, waits for the `#secure_captcha` image block to compile, screenshots the image element, and returns it as a Base64 string alongside the session ID.
2. **Same Context Binding**: The CAPTCHA displayed to the user and the eventual credentials form submission **must** share the exact same Playwright `BrowserContext`/`Page`. This binding is maintained by matching the session ID.
3. **CAPTCHA Refreshing**: The reload button on the client calls `POST /api/auth/captcha/refresh`. This clicks the portal's native `#btnRefresh` button inside the active Playwright context, waits for the new image blob to render, screenshots it, and returns the new image.
4. **Form Login**: Clicking login submits the credentials to `POST /api/auth/login`. Playwright fills the inputs on the portal page (`#username`, `#password`, `#captcha`) and submits the form by clicking `#btnLogin`. The portal's anti-bot telemetry scripts execute naturally inside the Chromium browser.
5. **Login Detection & Error Handling**:
   - **Successful Login**: The browser redirects away from `youLogin.jsp` to the dashboard URL. The session is flagged as `AUTHENTICATED`.
   - **Invalid Captcha / Credentials**: The page stays on `youLogin.jsp` and renders a warning banner. Cheerio extracts this warning and returns it in the API error response (e.g. `INVALID_CAPTCHA` or `INVALID_CREDENTIALS`). The client then triggers a captcha reload.
   - **Inactive Expiration**: If the portal session times out, the backend destroys the browser context, and the client redirects back to the login view.

---

## 7. API Documentation

### A. Auth Endpoints
#### `POST /api/auth/start`
- **Description**: Initializes a fresh Playwright browser context, loads the portal login page, captures the captcha image, and registers a temporary application session.
- **Request Body**: None
- **Response (200)**:
  ```json
  {
    "success": true,
    "sessionId": "b4a8e67a...",
    "captcha": "data:image/png;base64,iVBOR..."
  }
  ```

#### `POST /api/auth/captcha/refresh`
- **Description**: Reloads the captcha image inside the active session.
- **Headers**: `X-Session-ID: <session_id>`
- **Response (200)**:
  ```json
  {
    "success": true,
    "captcha": "data:image/png;base64,iVBOR..."
  }
  ```

#### `POST /api/auth/login`
- **Description**: Fills credentials and captcha on the active portal login page and submits.
- **Headers**: `X-Session-ID: <session_id>`
- **Request Body**:
  ```json
  {
    "netId": "sv3824",
    "password": "my_password",
    "captcha": "4f2a"
  }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "authenticated": true,
    "message": "Login successful"
  }
  ```
- **Error Responses**:
  - `400 (INVALID_CAPTCHA)`: Captcha is incorrect.
  - `401 (INVALID_CREDENTIALS)`: NetID or Password is incorrect.

#### `POST /api/auth/logout`
- **Description**: Closes browser resources and removes session mapping.
- **Headers**: `X-Session-ID: <session_id>`

---

### B. Student Endpoints
All student endpoints require `X-Session-ID` in the headers.

#### `GET /api/student/profile`
- **Description**: Navigates to `/srmiststudentportal/students/profile` and parses the student info table.
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "name": "STUDENT NAME",
      "studentId": "sv3824",
      "registerNumber": "RA21...",
      "email": "sv3824@srmist.edu.in",
      "institution": "SRM Institute of Science and Technology",
      "program": "B.Tech. Computer Science and Engineering",
      "semester": "6",
      "batch": "2021",
      "section": "A1",
      "facultyAdvisor": "Advisor Name",
      "status": "Active"
    }
  }
  ```

#### `GET /api/student/dashboard`
- **Description**: Navigates to the portal dashboard page and extracts CGPA, SGPA, earned credits, and recent notices.

#### `GET /api/student/grades`
- **Description**: Extracts the academic graded transcript table.

#### `GET /api/student/exams`
- **Description**: Extracts the scheduled provisional exam timetable.

#### `GET /api/student/hostel`
- **Description**: Extracts the allocated hostel name, room number, block name, and mess selection.

#### Unmapped Endpoints
For any pages/sections that are blank or unmapped (e.g. `/api/student/attendance` or `/api/student/timetable`), the backend returns:
```json
{
  "success": false,
  "error": {
    "code": "NOT_AVAILABLE",
    "message": "This section is not available on your SRM Portal profile."
  }
}
```

---

## 8. Development & Extension Guide

### How to add another SRM page/parser:
1. **Define the route**: In `backend/src/server.ts`, register the new route, e.g. `GET /api/student/fees`.
2. **Add URL**: In `backend/src/services/srmExtractor.ts`, add the corresponding page URL to the `URLS` list.
3. **Implement Cheerio Parser**: Create a parser file in `backend/src/parsers/` (e.g. `parse-fees.ts`) extracting target tags.
4. **Trigger Extraction**:
   In `srmExtractor.ts`, add an extraction handler that navigates to the URL, checks for success, loads the HTML into cheerio, parses, and returns the structured JSON.
5. **Handle fallback**: If the selector fails or page throws unauthorized, throw `Error('NOT_AVAILABLE')` so it triggers the standard warning block instead of crashing.
"# srm-api-wrapper" 
