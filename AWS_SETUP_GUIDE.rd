# AWS Management Console Setup Guide

This guide will walk you through setting up Amazon Cognito and DynamoDB for the Operations Care Dashboard application.

## Prerequisites

- AWS Account with appropriate permissions
- Access to AWS Management Console

## Step 1: Create DynamoDB Table

### 1.1 Navigate to DynamoDB
1. Log into AWS Management Console
2. Search for "DynamoDB" in the services search bar
3. Click on "DynamoDB" to open the service

### 1.2 Create Table
1. Click "Create table"
2. **Table name**: `ops-care-dash`
3. **Partition key**: `PK` (String)
4. **Sort key**: `SK` (String)
5. Click "Create table"

### 1.3 Create Global Secondary Index (Optional but Recommended)
1. Go to the "Indexes" tab of your table
2. Click "Create index"
3. **Index name**: `PK-timestamp-index`
4. **Partition key**: `PK` (String)
5. **Sort key**: `timestamp` (String)
6. Click "Create index"

## Step 2: Create Amazon Cognito User Pool

### 2.1 Navigate to Cognito
1. Search for "Cognito" in the services search bar
2. Click on "Amazon Cognito" to open the service

### 2.2 Create User Pool
1. Click "Create user pool"
2. **Step 1 - Configure sign-in experience**:
   - Choose "Email" as the sign-in option
   - Click "Next"
3. **Step 2 - Configure security requirements**:
   - Password policy: Use default or customize as needed
   - Multi-factor authentication: Optional
   - Click "Next"
4. **Step 3 - Configure sign-up experience**:
   - Self-service sign-up: Enable
   - Required attributes: Email
   - Click "Next"
5. **Step 4 - Configure message delivery**:
   - Email: Use Cognito default
   - Click "Next"
6. **Step 5 - Integrate your app**:
   - App name: `ops-care-dash-app`
   - Client secret: Optional (you can enable for additional security)
   - **Note**: If you enable client secret, you'll need to add `COGNITO_CLIENT_SECRET` to your .env file
   - Click "Next"
7. **Step 6 - Review and create**:
   - Review all settings
   - Click "Create user pool"

### 2.3 Add Custom Attribute for Role
1. After creating the user pool, go to "User attributes" tab
2. Click "Add custom attribute"
3. **Name**: `role`
4. **Type**: String
5. **Min length**: 1
6. **Max length**: 50
7. Click "Save changes"

### 2.4 Create App Client
1. Go to "App integration" tab
2. Scroll down to "App clients and analytics"
3. Click "Create app client"
4. **App type**: Public client
5. **App client name**: `ops-care-dash-client`
6. **Authentication flows**: 
   - ✅ ALLOW_ADMIN_USER_PASSWORD_AUTH
   - ✅ ALLOW_USER_PASSWORD_AUTH
7. Click "Create app client"

## Step 3: Create IAM User and Access Keys

### 3.1 Navigate to IAM
1. Search for "IAM" in the services search bar
2. Click on "IAM" to open the service

### 3.2 Create IAM User
1. Click "Users" in the left sidebar
2. Click "Create user"
3. **User name**: `ops-care-dash-service-user`
4. **Access type**: Programmatic access
5. Click "Next: Permissions"

### 3.3 Attach Policies
1. Click "Attach policies directly"
2. Search and select these policies:
   - `AmazonCognitoPowerUser`
   - `AmazonDynamoDBFullAccess`
3. Click "Next: Tags" (optional)
4. Click "Next: Review"
5. Click "Create user"

### 3.4 Save Access Keys
1. **IMPORTANT**: Copy the Access Key ID and Secret Access Key
2. Store these securely - you won't be able to see the secret key again

## Step 4: Configure Environment Variables

### 4.1 Copy the env.example file
```bash
cp backend/env.example backend/.env
```

### 4.2 Update the .env file with your values
```env
# AWS Configuration
AWS_REGION=us-east-1  # Change to your preferred region
AWS_ACCESS_KEY_ID=your_access_key_id_from_step_3_4
AWS_SECRET_ACCESS_KEY=your_secret_access_key_from_step_3_4

# Amazon Cognito Configuration
COGNITO_USER_POOL_ID=your_user_pool_id_from_step_2_2
COGNITO_CLIENT_ID=your_client_id_from_step_2_4

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=ops-care-dash

# Server Configuration
PORT=5000
JWT_SECRET=your_random_jwt_secret_string

# Optional: For development/testing
NODE_ENV=development
```

### 4.3 Where to find the IDs:
- **COGNITO_USER_POOL_ID**: Found in Cognito User Pool details page
- **COGNITO_CLIENT_ID**: Found in App client details page

## Step 5: Create Initial Admin User

### 5.1 Using AWS CLI (if available)
```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@hospital.com \
  --user-attributes Name=email,Value=admin@hospital.com Name=custom:role,Value=Admin \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

### 5.2 Using AWS Management Console
1. Go to your Cognito User Pool
2. Click "Users" tab
3. Click "Create user"
4. **Username**: `admin@hospital.com`
5. **Email**: `admin@hospital.com`
6. **Temporary password**: `TempPass123!`
7. **Custom attributes**: `role` = `Admin`
8. **Mark email as verified**: Yes
9. Click "Create user"

## Step 6: Test the Setup

### 6.1 Install Dependencies
```bash
cd backend
npm install
```

### 6.2 Start the Server
```bash
npm start
```

### 6.3 Test Login
- Use the admin credentials created in Step 5
- The application should now authenticate against Cognito
- User management should work with DynamoDB

## Troubleshooting

### Common Issues:
1. **Access Denied**: Check IAM permissions
2. **User Pool Not Found**: Verify COGNITO_USER_POOL_ID
3. **Table Not Found**: Verify DYNAMODB_TABLE_NAME and region
4. **Authentication Failed**: Check COGNITO_CLIENT_ID

### Useful AWS CLI Commands:
```bash
# List user pools
aws cognito-idp list-user-pools --max-items 10

# List DynamoDB tables
aws dynamodb list-tables

# Test Cognito authentication
aws cognito-idp admin-initiate-auth \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-id YOUR_CLIENT_ID \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=admin@hospital.com,PASSWORD=TempPass123!
```

## Security Notes

1. **Never commit .env files** to version control
2. **Rotate access keys** regularly
3. **Use least privilege** IAM policies
4. **Enable MFA** on your AWS account
5. **Monitor CloudTrail** for API calls

## Cost Considerations

- **DynamoDB**: Pay per request and storage
- **Cognito**: Pay per monthly active users
- **IAM**: Free service
- Consider using AWS Free Tier for development/testing
