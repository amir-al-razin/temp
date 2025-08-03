# Eagles Mentorship Platform - Feature Testing Guide

## Prerequisites
1. Set up Supabase project with the provided schema
2. Configure environment variables in `.env`
3. Run `npm install` and `npm run dev`

## Manual Testing Checklist

### 1. Authentication Flow ✅
- [ ] **Sign Up**
  - Navigate to `/auth`
  - Try signing up with non-university email (should fail)
  - Sign up with university email (should succeed)
  - Check email verification

- [ ] **Sign In**
  - Sign in with valid credentials
  - Try invalid credentials (should fail)
  - Check automatic redirect to dashboard

### 2. Profile Management ✅
- [ ] **Profile Creation**
  - Complete profile after first login
  - Upload avatar image
  - Set department and year
  - Add bio information

- [ ] **Profile Updates**
  - Navigate to `/profile`
  - Update profile information
  - Verify changes are saved

### 3. Mentor Application Process ✅
- [ ] **Apply to be Mentor**
  - Navigate to `/mentors/apply`
  - Fill out application form
  - Submit expertise tags
  - Add achievements and experience

- [ ] **Admin Review**
  - Login as admin
  - Navigate to `/admin/applications`
  - Review pending applications
  - Approve/reject applications

### 4. Mentor Discovery ✅
- [ ] **Browse Mentors**
  - Navigate to `/mentors/explore`
  - View approved mentors
  - Use search functionality
  - Filter by expertise/department

### 5. Session Management ✅
- [ ] **Request Session**
  - Select a mentor
  - Fill out session request form
  - Submit request

- [ ] **Mentor Response**
  - Login as mentor
  - View pending requests
  - Accept/decline requests

- [ ] **Session Communication**
  - Navigate to active session
  - Send text messages
  - Upload files
  - Test real-time messaging

### 6. Video Calling ✅
- [ ] **Start Video Call**
  - Mentor initiates video call
  - Verify Jitsi integration
  - Test audio/video functionality

- [ ] **Call Management**
  - End video call
  - Verify call duration tracking

### 7. Notification System ✅
- [ ] **Real-time Notifications**
  - Send session request (mentor should get notification)
  - Send message (recipient should get notification)
  - Check notification bell icon

- [ ] **Notification Management**
  - Navigate to `/notifications`
  - Mark notifications as read
  - Clear all notifications

### 8. Admin Features ✅
- [ ] **Admin Dashboard**
  - Navigate to `/admin/dashboard`
  - View platform statistics
  - Check user counts

- [ ] **Analytics**
  - Navigate to `/admin/analytics`
  - View session statistics
  - Check user activity

### 9. Session Completion ✅
- [ ] **Complete Session**
  - Mark session as complete
  - Verify status update

- [ ] **Feedback System**
  - Navigate to feedback page
  - Submit session rating
  - Add comments

### 10. Chat History ✅
- [ ] **View History**
  - Navigate to `/chat/history`
  - View completed sessions
  - Access past conversations

## Automated Testing Commands

```bash
# Install dependencies
npm install

# Run type checking
npm run build

# Run linting
npm run lint

# Start development server
npm run dev
```

## Database Testing Queries

```sql
-- Check user profiles
SELECT * FROM profiles LIMIT 5;

-- Check mentor applications
SELECT m.*, p.full_name, p.email 
FROM mentors m 
JOIN profiles p ON m.user_id = p.id;

-- Check sessions
SELECT s.*, 
  student.full_name as student_name,
  mentor.full_name as mentor_name
FROM sessions s
JOIN profiles student ON s.student_id = student.id
JOIN profiles mentor ON s.mentor_id = mentor.id;

-- Check notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check messages
SELECT m.*, p.full_name as sender_name
FROM messages m
JOIN profiles p ON m.sender_id = p.id
ORDER BY m.created_at DESC LIMIT 10;
```

## Performance Testing

### Load Testing Scenarios
1. **Concurrent Users**: 50+ users browsing mentors
2. **Real-time Messaging**: Multiple active chat sessions
3. **File Uploads**: Large file uploads (up to 10MB)
4. **Database Queries**: Complex filtering and search

### Performance Metrics to Monitor
- Page load times
- Database query performance
- Real-time message delivery
- File upload speeds
- Memory usage

## Security Testing

### Authentication Security
- [ ] Test SQL injection attempts
- [ ] Verify RLS policies work correctly
- [ ] Test unauthorized access attempts
- [ ] Verify file upload restrictions

### Data Privacy
- [ ] Verify users can only see their own data
- [ ] Test mentor-student data isolation
- [ ] Verify admin access controls

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] Chrome Mobile
- [ ] Safari Mobile
- [ ] Firefox Mobile

## Accessibility Testing

### Screen Reader Compatibility
- [ ] Test with NVDA/JAWS
- [ ] Verify proper ARIA labels
- [ ] Check keyboard navigation

### Visual Accessibility
- [ ] Test color contrast
- [ ] Verify text scaling
- [ ] Check focus indicators

## Common Issues & Solutions

### Build Errors
- **TypeScript errors**: Fix `any` types with proper interfaces
- **ESLint warnings**: Remove unused imports and variables
- **Missing dependencies**: Check useEffect dependency arrays

### Runtime Issues
- **Supabase connection**: Verify environment variables
- **Authentication errors**: Check RLS policies
- **Real-time not working**: Verify Supabase subscriptions

### Performance Issues
- **Slow page loads**: Implement lazy loading
- **Large bundle size**: Optimize imports
- **Memory leaks**: Clean up subscriptions

## Test Results Template

```markdown
## Test Results - [Date]

### Passed Tests ✅
- Authentication flow
- Profile management
- Mentor discovery
- Session messaging

### Failed Tests ❌
- Video calling (Jitsi configuration issue)
- File uploads (Storage bucket not configured)

### Performance Metrics
- Average page load: 2.3s
- Database query time: 150ms
- Real-time message delay: 50ms

### Browser Compatibility
- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ⚠️ Minor CSS issues
- Mobile: ✅ Responsive design works

### Recommendations
1. Fix Jitsi configuration
2. Set up Supabase storage bucket
3. Optimize CSS for Safari
4. Add loading states for better UX
```

## Continuous Testing Strategy

### Daily Checks
- [ ] Authentication flow
- [ ] Core messaging functionality
- [ ] Database connectivity

### Weekly Checks
- [ ] Full feature regression testing
- [ ] Performance monitoring
- [ ] Security vulnerability scan

### Monthly Checks
- [ ] Comprehensive accessibility audit
- [ ] Cross-browser compatibility
- [ ] Load testing with realistic data

This testing guide ensures comprehensive validation of all platform features and helps maintain quality as the application evolves.