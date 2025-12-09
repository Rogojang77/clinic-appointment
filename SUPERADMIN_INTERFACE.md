# SuperAdmin Interface Documentation

## Overview

The SuperAdmin interface provides comprehensive management capabilities for clinic sections, users, and activity schedules. This interface is accessible only to users with SuperAdmin privileges (role: 'admin' and isAdmin: true).

## Access Control

- **Authentication Required**: Users must be logged in
- **Role Requirement**: Users must have `role: 'admin'`
- **SuperAdmin Flag**: Users must have `isAdmin: true`
- **Route Protection**: All SuperAdmin routes are protected by middleware

## Navigation

The SuperAdmin interface can be accessed through:
1. **Main Navigation**: "SuperAdmin" link appears in the main navbar for authorized users
2. **Direct URL**: `/superadmin` (redirects to dashboard if unauthorized)

## Interface Structure

### Layout
- **Sidebar Navigation**: Persistent sidebar with navigation links
- **Top Bar**: User information and logout functionality
- **Main Content**: Dynamic content area for each section
- **Responsive Design**: Mobile-friendly with collapsible sidebar

### Navigation Menu
- **Dashboard**: Overview and statistics
- **Sections**: Manage clinic sections/departments
- **Users**: Manage system users and permissions
- **Activity Schedules**: Manage user activity schedules

## Features

### 1. Dashboard (`/superadmin`)

**Overview Statistics:**
- Total users (with active count)
- Total sections (with active count)
- Total activity schedules (with active count)
- User role distribution (admin vs operator)

**Data Visualization:**
- Sections overview with user counts
- Recent user activity
- Recent schedule activity
- Section status indicators

### 2. Sections Management (`/superadmin/sections`)

**CRUD Operations:**
- **Create**: Add new clinic sections
- **Read**: View all sections in a sortable table
- **Update**: Edit section details
- **Delete**: Remove sections (with confirmation)

**Section Fields:**
- Name (required, unique)
- Description (optional)
- Active status (checkbox)

**Features:**
- Sortable columns
- Pagination
- Search and filtering
- Status indicators (Active/Inactive)
- Creation date display

### 3. Users Management (`/superadmin/users`)

**CRUD Operations:**
- **Create**: Add new system users
- **Read**: View all users with section information
- **Update**: Edit user details and permissions
- **Delete**: Remove users (with confirmation)

**User Fields:**
- Username (required, unique)
- Email (required, unique, validated)
- Password (required for new users, optional for updates)
- Section assignment (required, dropdown from available sections)
- Role (admin/operator)
- SuperAdmin flag (checkbox)
- Verification status (checkbox)

**Features:**
- Section assignment dropdown
- Role-based permissions
- Password hashing (automatic)
- Email validation
- Status indicators (Verified/Pending)
- Role badges (Admin/Operator/SuperAdmin)

### 4. Activity Schedules (`/superadmin/schedules`)

**CRUD Operations:**
- **Create**: Create user activity schedules for sections
- **Read**: View all schedules with user and section info
- **Update**: Modify schedule details and time slots
- **Delete**: Remove schedules (with confirmation)

**Schedule Features:**
- User-section pairing (unique constraint)
- Weekly schedule management
- Daily time slot configuration
- Working day toggles
- Time slot availability flags

**Time Management:**
- Start/end time configuration
- Multiple time slots per day
- Working day indicators
- Availability status per slot

**Schedule Structure:**
```typescript
{
  userId: string,
  sectionId: string,
  schedule: [
    {
      day: 'Monday',
      timeSlots: [
        {
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true
        }
      ],
      isWorkingDay: true
    }
  ],
  isActive: boolean
}
```

## Components

### Reusable Components

1. **SuperAdminLayout**
   - Sidebar navigation
   - Top bar with user info
   - Responsive design
   - Access control

2. **DataTable**
   - Sortable columns
   - Pagination
   - Action buttons (Edit, Delete, View)
   - Loading states
   - Empty states

3. **Modal**
   - Form dialogs
   - Multiple sizes (sm, md, lg, xl)
   - Keyboard navigation
   - Backdrop click to close

4. **FormField**
   - Various input types (text, email, select, checkbox, textarea)
   - Validation display
   - Required field indicators
   - Consistent styling

### API Integration

**Service Layer (`services/api.ts`):**
- Centralized API calls
- Type-safe interfaces
- Error handling
- Request/response interceptors
- Authentication token management

**API Endpoints Used:**
- `/api/sections` - Section management
- `/api/users` - User management
- `/api/activity-schedules` - Schedule management
- `/api/dashboard` - Dashboard statistics

## Security Features

### Authentication & Authorization
- JWT token validation
- Role-based access control
- Route-level protection
- Automatic token refresh
- Secure logout

### Data Validation
- Client-side form validation
- Server-side validation
- Input sanitization
- SQL injection prevention
- XSS protection

### User Experience
- Loading indicators
- Error handling with toast notifications
- Confirmation dialogs for destructive actions
- Responsive design
- Keyboard navigation support

## Usage Examples

### Creating a Complete User with Schedule

1. **Create Section**:
   - Navigate to Sections → Add Section
   - Enter name: "Emergency Department"
   - Add description: "24/7 emergency services"
   - Set as Active

2. **Create User**:
   - Navigate to Users → Add User
   - Enter username: "dr_smith"
   - Enter email: "dr.smith@hospital.com"
   - Set password: "secure_password"
   - Select section: "Emergency Department"
   - Set role: "Operator"
   - Verify user

3. **Create Activity Schedule**:
   - Navigate to Activity Schedules → Add Schedule
   - Select user: "dr_smith"
   - Select section: "Emergency Department"
   - Configure weekly schedule:
     - Monday: 08:00-16:00 (Available)
     - Tuesday: 08:00-16:00 (Available)
     - Wednesday: Off
     - etc.

### Managing Existing Data

**Bulk Operations:**
- Filter users by role or section
- Sort schedules by creation date
- View section statistics on dashboard

**Quick Actions:**
- Edit user permissions
- Toggle section status
- Update schedule time slots
- Verify/unverify users

## Technical Implementation

### Technology Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide React
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### File Structure
```
app/superadmin/
├── page.tsx                    # Dashboard
├── sections/page.tsx          # Sections management
├── users/page.tsx             # Users management
└── schedules/page.tsx         # Schedules management

components/superadmin/
├── SuperAdminLayout.tsx       # Main layout
├── DataTable.tsx              # Reusable table
├── Modal.tsx                  # Modal dialog
└── FormField.tsx              # Form input component

services/
└── api.ts                     # API service layer
```

### State Management
- User authentication state (Zustand)
- Form state (React useState)
- API response caching
- Loading and error states

## Best Practices

### Code Organization
- Component separation of concerns
- Reusable UI components
- Type-safe API interfaces
- Consistent error handling

### User Experience
- Progressive loading
- Optimistic updates
- Clear feedback messages
- Intuitive navigation

### Security
- Input validation
- Role-based access
- Secure API communication
- Session management

## Troubleshooting

### Common Issues

1. **Access Denied**
   - Verify user has `role: 'admin'` and `isAdmin: true`
   - Check authentication token validity
   - Ensure middleware is properly configured

2. **API Errors**
   - Check network connectivity
   - Verify API endpoint availability
   - Review server logs for detailed errors

3. **Form Validation**
   - Ensure all required fields are filled
   - Check email format validity
   - Verify unique constraints (username, email, section names)

### Performance Optimization
- Implement data pagination
- Use React.memo for expensive components
- Optimize API calls with proper caching
- Lazy load non-critical components

## Future Enhancements

### Planned Features
- Advanced filtering and search
- Bulk operations (import/export)
- Audit logs and activity tracking
- Advanced reporting and analytics
- Role-based dashboard customization
- Mobile app integration

### Scalability Considerations
- Database indexing for large datasets
- API response pagination
- Caching strategies
- Background job processing
- Microservices architecture
