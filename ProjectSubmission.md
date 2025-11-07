# Project Submission: Ops Care Dashboard

This document provides the required content and steps for the project submission in a single PDF format. Each section corresponds to the specified requirements, including screenshots (described with steps to capture them), content, and steps where applicable.

## 1. Integration/Regression/Mutation Testing (Screenshots)

The project currently lacks automated testing frameworks for integration, regression, and mutation testing. However, the backend includes basic test files (`test-engine.js`, `test-single.js`, `test.txt`) for simulation engines. To implement and capture screenshots for these tests, follow these steps:

### Steps to Set Up and Run Tests:
1. **Install Testing Frameworks**:
   - For integration and regression testing, install Jest or Mocha: `npm install --save-dev jest` (in backend directory).
   - For mutation testing, install Stryker: `npm install --save-dev @stryker-mutator/core`.

2. **Configure Tests**:
   - Create test files in `backend/tests/` directory.
   - Example integration test for user creation (using Jest):
     ```javascript
     const request = require('supertest');
     const app = require('../server');

     describe('User API Integration Tests', () => {
       it('should create a new user', async () => {
         const response = await request(app)
           .post('/api/users')
           .send({ username: 'testuser', password: 'testpass' });
         expect(response.status).toBe(201);
       });
     });
     ```
   - For regression tests, add tests for existing endpoints (e.g., simulation requests, reports).
   - For mutation testing, run Stryker on key files like `UserService.js`.

3. **Run Tests**:
   - Integration/Regression: `npm test` (update package.json scripts).
   - Mutation: `npx stryker run`.

4. **Capture Screenshots**:
   - Run tests in terminal: Open command prompt, navigate to `backend/`, run `npm test`.
   - Screenshot the terminal output showing passing/failing tests.
   - For mutation testing, screenshot the Stryker report (HTML output).
   - Example Screenshots: [Insert screenshots here - e.g., terminal with "Tests: 5 passed", Stryker mutation score report].

If tests are already run, include screenshots of the test results from your local environment.

## 2. Version Management and System Building (Screenshots)

Version management is handled via Git, and system building uses npm scripts.

### Steps for Version Management:
1. **Initialize/Use Git Repository**:
   - The project uses Git (evidenced by `.gitignore`).
   - Check repository status: `git status`.
   - View commit history: `git log --oneline`.
   - Create branches for features: `git checkout -b feature/new-feature`.

2. **Capture Screenshots**:
   - Screenshot of `git log` showing commit history (e.g., commits for user management, simulation fixes).
   - Screenshot of `git branch` showing branches (e.g., main, develop).
   - Screenshot of GitHub repository page if pushed online, showing pull requests or issues.

### Steps for System Building:
1. **Build the Project**:
   - Frontend: `npm run build` (produces dist/ folder).
   - Backend: `npm run build` if configured, or use `npm start` for production.

2. **Capture Screenshots**:
   - Screenshot of terminal running `npm run build` for frontend, showing successful build output.
   - Screenshot of `npm run build:dev` or production start.
   - Screenshot of built files in `dist/` or backend running on port (e.g., via `npm start`).

Example Screenshots: [Insert screenshots - e.g., Git log, npm build output].

## 3. Screenshots of Developed Functionalities

The application is a healthcare operations dashboard with features like user management, simulation requests, pharmacy management, and reports. Key functionalities include:

- **User Authentication and Management**: Login via AWS Cognito, role-based access (admin, clinical, operator, pharmacist).
- **Simulation Engine**: DES-based simulations for clinics, OR, beds.
- **Pharmacy and Requests**: Manage pharmacy requests and feedback.
- **Reports and Audit Logs**: Generate reports, view audit logs.

### Steps to Capture Screenshots:
1. **Start the Application**:
   - Backend: `cd backend && npm run dev`.
   - Frontend: `npm run dev`.
   - Access at `http://localhost:5173` (frontend) and `http://localhost:3000` (backend).

2. **Navigate and Capture**:
   - Login page: Screenshot of login form.
   - Dashboard: Screenshot of main dashboard post-login.
   - Simulation Request: Screenshot of creating a simulation request.
   - User Management (Admin): Screenshot of user list and creation form.
   - Reports: Screenshot of generated report (e.g., PDF export).
   - Pharmacy Requests: Screenshot of request list and status updates.
   - Audit Logs: Screenshot of logs page.

3. **Include Browser Screenshots**: Use browser dev tools or screenshot tool to capture full pages.

Example Screenshots: [Insert screenshots - e.g., Dashboard UI, Simulation Form, Report View].

## 4. Tools/Technologies Used

Based on `package.json`, `README.md`, and project structure, the following tools and technologies are used:

### Frontend:
- **Framework**: React (v18.3.1) with TypeScript.
- **Build Tool**: Vite (v5.4.19).
- **UI Library**: shadcn-ui (Radix UI components), Tailwind CSS (v3.4.17).
- **Routing**: React Router DOM (v6.30.1).
- **State Management**: React Query (@tanstack/react-query v5.83.0).
- **Forms**: React Hook Form (v7.61.1) with Zod (v3.25.76) for validation.
- **Charts**: Recharts (v3.2.1).
- **Icons**: Lucide React (v0.462.0).
- **Other**: Axios (v1.13.1) for API calls, Next Themes (v0.3.0) for theming.

### Backend:
- **Runtime**: Node.js with Express (v5.1.0).
- **Authentication**: AWS Cognito (via aws-jwt-verify v5.1.1), JWT (jsonwebtoken v9.0.2).
- **Database**: AWS DynamoDB (aws-sdk v2.1691.0).
- **Security**: bcryptjs (v3.0.2) for hashing (though partially removed for Cognito).
- **Logging**: Winston (enhanced in logger.js).
- **Simulation Engines**: Python-based DES (Discrete Event Simulation) for clinics/OR/beds.
- **Other**: CORS (v2.8.5), dotenv (v17.2.2), Nodemon (v3.1.10) for dev.

### Development Tools:
- **Version Control**: Git.
- **Package Manager**: npm (with package-lock.json).
- **Linting**: ESLint (v9.32.0).
- **TypeScript**: v5.8.3.
- **Deployment**: Lovable for hosting, AWS for backend services.

### Steps to Verify:
- Check `package.json` for dependencies.
- Run `npm list` to see installed packages.
- For AWS setup, refer to `AWS_SETUP_GUIDE.rd`.

This MD file can be converted to PDF using tools like Pandoc (`pandoc ProjectSubmission.md -o ProjectSubmission.pdf`) or online converters. Insert actual screenshots into the PDF before submission.
