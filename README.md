# FlowSync - Client Server Integration

## Overview

FlowSync is a full-stack application that helps users manage and synchronize messages and tasks from various services. The application consists of:

- **Client**: React/TypeScript frontend built with Vite
- **Server**: Express.js backend with Firebase integration

## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- Firebase account with a project set up
- FirebaseAdmin SDK service account key

### Server Setup

1. Navigate to the server directory:
```
cd server
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the server directory based on `.env.example`:
```
# Server Configuration
PORT=3000
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="your_private_key_with_quotes"
FIREBASE_DATABASE_URL=https://your_project_id.firebaseio.com

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT Secret (if needed beyond Firebase)
JWT_SECRET=your_jwt_secret_key_here
```

4. Place your Firebase service account key at `server/config/serviceAccountKey.json`

5. Start the server:
```
npm start
```

### Client Setup

1. Navigate to the client directory:
```
cd client
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file in the client directory based on `.env.example`:
```
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
```

4. Start the client:
```
npm run dev
```

## Architecture

### Client-Server Communication

The client and server are connected through a RESTful API:

1. **Authentication Flow**:
   - Client uses Firebase SDK for authentication
   - Server verifies Firebase tokens on protected endpoints
   - After successful authentication, client obtains user profile from server

2. **API Communication**:
   - Client includes Firebase auth token in API requests
   - Server validates tokens and associates requests with users
   - All API requests exchange JSON data

### Server API Endpoints

#### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login existing user
- `POST /api/auth/google-signin` - Sign in with Google
- `POST /api/auth/logout` - Logout current user
- `POST /api/auth/create-profile` - Create or update user profile after authentication

#### User Endpoints
- `GET /api/user/profile` - Get user profile data
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/preferences` - Get user preferences
- `PUT /api/user/preferences` - Update user preferences

#### Messages Endpoints
- `GET /api/messages` - Get all user messages
- `GET /api/messages/:id` - Get a specific message
- `POST /api/messages` - Create a new message

#### Tasks Endpoints
- `GET /api/tasks` - Get all user tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

#### Service Endpoints
- `GET /api/services` - Get all service connections
- `GET /api/services/status` - Get service status

## Security Considerations

1. **Authentication**: Firebase Auth tokens are used for secure authentication
2. **CORS**: Configured to only allow requests from specified origins
3. **Environment Variables**: Sensitive data is stored in environment variables
4. **Error Handling**: Proper error handling to avoid leaking sensitive information

## Development Guidelines

1. **TypeScript**: Use strong typing whenever possible in the client
2. **Error Handling**: Always handle errors gracefully on both server and client
3. **Token Management**: Keep Firebase tokens secure and refresh as needed
4. **API Service Layer**: All API calls should go through the API service layer
5. **Environment Configuration**: Never commit actual `.env` files to version control
