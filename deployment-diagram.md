# Ops Care Dashboard - Deployment Architecture

```plantuml
@startuml Deployment Diagram

title Ops Care Dashboard - Deployment Architecture

node "User's Browser" as browser {
  artifact "React Frontend\n(TypeScript + Vite)" as frontend
}

node "AWS Cloud" as aws {
  node "Web Server/EC2" as server {
    artifact "Express Backend\n(Node.js)" as backend
    artifact "Simulation Engines\n(Python)" as engines
  }

  database "DynamoDB" as dynamodb {
    artifact "User Data" as user_data
    artifact "Simulation Requests" as sim_requests
    artifact "Simulation Results" as sim_results
    artifact "Audit Logs" as audit_logs
    artifact "Pharmacy Data" as pharmacy_data
  }

  node "AWS Cognito" as cognito {
    artifact "User Pool" as user_pool
  }
}

browser --> frontend : HTTPS
frontend --> backend : REST API
backend --> cognito : Authentication
backend --> dynamodb : Data Operations
backend --> engines : Simulation Execution

note right of frontend
  Deployed as static files
  (S3 + CloudFront or similar)
end note

note right of backend
  RESTful API endpoints:
  - /auth (authentication)
  - /users (user management)
  - /simulations (ops simulations)
  - /reports (reporting)
  - /pharmacy (medicine management)
end note

note right of engines
  Python DES engines:
  - Clinic simulation
  - OR scheduling
  - Bed allocation
  - Queueing models
end note

note right of dynamodb
  Tables:
  - ops-care-dash (main)
  - ops-care-sim-requests
  - ops-care-sim-results
  - ops-care-pharmacy
end note

@enduml
```

## Architecture Overview

This deployment diagram shows the Ops Care Dashboard architecture with the following components:

- **Frontend**: React application built with TypeScript and Vite, deployed as static files
- **Backend**: Node.js Express server handling API requests
- **Authentication**: AWS Cognito User Pool for user management and authentication
- **Database**: DynamoDB with multiple tables for different data types
- **Simulation Engines**: Python-based discrete event simulation engines for healthcare operations modeling

## Key Features

- Role-based access control (Admin, Operator, Pharmacist, Clinical)
- Real-time simulation of healthcare operations
- Audit logging for compliance
- Pharmacy inventory management
- RESTful API architecture
