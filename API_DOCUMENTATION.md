# Backend API Documentation

This document provides comprehensive documentation for the backend API endpoints that manage users, sections, and activity schedules.

## Base URL
```
/api
```

## Authentication
All endpoints require proper authentication. Include the authorization token in the request headers:
```
Authorization: Bearer <your-token>
```

## API Endpoints

### 1. Sections Management

#### Get All Sections
```http
GET /api/sections
```

**Query Parameters:**
- `activeOnly` (boolean, optional): Filter only active sections

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "section_id",
      "name": "Section Name",
      "description": "Section description",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Single Section
```http
GET /api/sections/{id}
```

#### Create Section
```http
POST /api/sections
```

**Request Body:**
```json
{
  "name": "Section Name",
  "description": "Optional description",
  "isActive": true
}
```

#### Update Section
```http
PUT /api/sections/{id}
```

#### Delete Section
```http
DELETE /api/sections/{id}
```

### 2. Users Management

#### Get All Users
```http
GET /api/users
```

**Query Parameters:**
- `role` (string, optional): Filter by role (admin/operator)
- `accessSection` (string, optional): Filter by section ID
- `isActive` (boolean, optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "operator",
      "isAdmin": false,
      "isverified": true,
      "accessSection": "section_id",
      "section": {
        "_id": "section_id",
        "name": "Section Name",
        "description": "Section description"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create User
```http
POST /api/users
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password",
  "accessSection": "section_id",
  "role": "operator",
  "isAdmin": false
}
```

#### Get Single User
```http
GET /api/users/{id}
```

#### Update User
```http
PUT /api/users/{id}
```

**Request Body:**
```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "password": "new_password",
  "accessSection": "new_section_id",
  "role": "admin",
  "isAdmin": true,
  "isverified": true
}
```

#### Delete User
```http
DELETE /api/users/{id}
```

### 3. Activity Schedules Management

#### Get All Activity Schedules
```http
GET /api/activity-schedules
```

**Query Parameters:**
- `userId` (string, optional): Filter by user ID
- `sectionId` (string, optional): Filter by section ID
- `isActive` (boolean, optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "schedule_id",
      "userId": {
        "_id": "user_id",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "operator"
      },
      "sectionId": {
        "_id": "section_id",
        "name": "Section Name",
        "description": "Section description"
      },
      "schedule": [
        {
          "day": "Monday",
          "timeSlots": [
            {
              "startTime": "09:00",
              "endTime": "17:00",
              "isAvailable": true
            }
          ],
          "isWorkingDay": true
        }
      ],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Create Activity Schedule
```http
POST /api/activity-schedules
```

**Request Body:**
```json
{
  "userId": "user_id",
  "sectionId": "section_id",
  "schedule": [
    {
      "day": "Monday",
      "timeSlots": [
        {
          "startTime": "09:00",
          "endTime": "17:00",
          "isAvailable": true
        }
      ],
      "isWorkingDay": true
    }
  ],
  "isActive": true
}
```

#### Get Single Activity Schedule
```http
GET /api/activity-schedules/{id}
```

#### Update Activity Schedule
```http
PUT /api/activity-schedules/{id}
```

**Request Body:**
```json
{
  "schedule": [
    {
      "day": "Monday",
      "timeSlots": [
        {
          "startTime": "08:00",
          "endTime": "18:00",
          "isAvailable": true
        }
      ],
      "isWorkingDay": true
    }
  ],
  "isActive": false
}
```

#### Delete Activity Schedule
```http
DELETE /api/activity-schedules/{id}
```

#### Get User's Activity Schedules
```http
GET /api/activity-schedules/user/{userId}
```

**Query Parameters:**
- `isActive` (boolean, optional): Filter by active status

#### Get Section's Activity Schedules
```http
GET /api/activity-schedules/section/{sectionId}
```

**Query Parameters:**
- `isActive` (boolean, optional): Filter by active status

### 4. Dashboard

#### Get Dashboard Overview
```http
GET /api/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 50,
      "totalSections": 5,
      "totalActivitySchedules": 25,
      "activeUsers": 45,
      "activeSections": 4,
      "activeActivitySchedules": 20
    },
    "usersByRole": {
      "admin": 5,
      "operator": 45
    },
    "sectionsWithSchedules": [
      {
        "sectionName": "Section A",
        "scheduleCount": 10
      }
    ],
    "sectionsWithUserCounts": [
      {
        "name": "Section A",
        "description": "Description",
        "isActive": true,
        "userCount": 15
      }
    ],
    "recentActivity": {
      "users": [...],
      "schedules": [...]
    }
  }
}
```

## Data Models

### Section
```typescript
interface Section {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### User
```typescript
interface User {
  _id: string;
  username: string;
  email: string;
  role: "admin" | "operator";
  isAdmin: boolean;
  isverified: boolean;
  accessSection: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Activity Schedule
```typescript
interface ActivitySchedule {
  _id: string;
  userId: string;
  sectionId: string;
  schedule: DailySchedule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DailySchedule {
  day: string;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Usage Examples

### Creating a Complete User with Schedule

1. **Create a Section:**
```bash
curl -X POST http://localhost:3000/api/sections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Emergency Department",
    "description": "24/7 emergency services"
  }'
```

2. **Create a User:**
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dr_smith",
    "email": "dr.smith@hospital.com",
    "password": "secure_password",
    "accessSection": "section_id_from_step_1",
    "role": "operator"
  }'
```

3. **Create Activity Schedule:**
```bash
curl -X POST http://localhost:3000/api/activity-schedules \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_from_step_2",
    "sectionId": "section_id_from_step_1",
    "schedule": [
      {
        "day": "Monday",
        "timeSlots": [
          {
            "startTime": "08:00",
            "endTime": "16:00",
            "isAvailable": true
          }
        ],
        "isWorkingDay": true
      },
      {
        "day": "Tuesday",
        "timeSlots": [
          {
            "startTime": "08:00",
            "endTime": "16:00",
            "isAvailable": true
          }
        ],
        "isWorkingDay": true
      }
    ]
  }'
```

## Notes

- All timestamps are in ISO 8601 format
- Passwords are automatically hashed using bcrypt
- User passwords are excluded from GET responses for security
- Activity schedules have a unique constraint on userId + sectionId combination
- All endpoints validate ObjectId format for MongoDB references
- The dashboard endpoint provides aggregated statistics for administrative overview
