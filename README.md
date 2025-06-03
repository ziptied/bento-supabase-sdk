# Bento Supabase Integration

An example user creation flow with email verification using Supabase Edge Functions and Bento email service.

## Features

- **User Registration**: Create users in Supabase Auth with Bento email confirmation
- **Email Verification**: Send confirmation emails via Bento with custom templates
- **Event Tracking**: Track user confirmation events in Bento for analytics
- **Error Handling**: Comprehensive error handling and validation

## Requirements

- Supabase project with Edge Functions enabled
- Bento account with API access
- Deno runtime (handled by Supabase Edge Functions)
- Application Frontend with a URL to handle the verification

## Getting Started

### 1. Bento Setup

1. Create a [Bento account](https://app.bentonow.com)
2. Navigate to your Bento dashboard
3. Get your API credentials:
    - **Site UUID**: Found in your site settings
    - **Publishable Key**: Public API key for client-side operations
    - **Secret Key**: Private API key for server-side operations

### 2. Supabase Configuration

#### Database Schema

Ensure your `public.users` table exists with these columns:

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Environment Variables

Set these environment variables in your Supabase project:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BENTO_SITE_UUID=your-bento-site-uuid
BENTO_PUBLISHABLE_KEY=your-bento-publishable-key
BENTO_SECRET_KEY=your-bento-secret-key
```

### 3. Deploy Edge Functions

Create two Edge Functions in your Supabase project:

#### Function 1: `register-user`

```typescript
// supabase/functions/register-user/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// [Copy the signup-user/index.ts content here]
```

#### Function 2: `verify-user`

```typescript
// supabase/functions/verify-user/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// [Copy the verify-user/index.ts content here]
```

Deploy both functions:

```bash
supabase functions deploy register-user
supabase functions deploy verify-user
```

## Usage

### User Registration

Register a new user with email confirmation:

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/register-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword123'
  })
});

const result = await response.json();
```

**Response:**
```json
{
  "message": "User created and confirmation sent",
  "user_id": "uuid-here"
}
```

### User Verification

Verify a user after they click the confirmation link:

>[!TIP]
>It's best to use post events from your app not get links in your email body
this is because email applications and providors can visit get links as part of spam checks
and might confirm a user

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/verify-user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    user_id: 'user-uuid-from-registration'
  })
});

const result = await response.json();
```

**Response:**
```json
{
  "message": "User verified and event sent",
  "email": "user@example.com"
}
```

## API Reference

### POST /register-user

Creates a new user and sends confirmation email.

**Request Body:**
- `email` (string, required): Valid email address
- `password` (string, required): User password

**Responses:**
- `200`: User created successfully
- `400`: Invalid email/password
- `405`: Method not allowed
- `500`: Server error

### POST /verify-user

Verifies a user and tracks confirmation event.

**Request Body:**
- `user_id` (string, required): UUID of user to verify

**Responses:**
- `200`: User verified successfully
- `400`: Missing user_id or other error
- `500`: Server error

## Customization

### Email Template

Update the confirmation email in the `register-user` function:

```typescript
// Modify this section in register-user/index.ts
const confirmUrl = `https://yourapp.com/verify?user=${userId}`;
const emailRes = await fetch(`https://app.bentonow.com/api/v1/batch/emails?site_uuid=${BENTO_SITE_UUID}`, {
  // ... other config
  body: JSON.stringify({
    emails: [{
      to: email,
      from: "noreply@yourapp.com", // Change sender to your bento Author
      subject: "Welcome! Please confirm your email", // Custom subject
      html_body: `
        <h1>Welcome to Our App!</h1>
        <p>Click <a href="${confirmUrl}">this link</a> to confirm your email.</p>
      `, // Custom HTML template
      transactional: true
    }]
  })
});
```

### Verification URL

Update the confirmation URL to point to your application:

```typescript
// Change this line in register-user/index.ts
const confirmUrl = `https://yourapp.com/verify?user=${userId}`;
```

Then handle this URL in your frontend application to call the verify-user function.

## Error Handling

Both functions include comprehensive error handling:

- **Validation errors**: Invalid email format, missing fields
- **Database errors**: User creation or update failures
- **API errors**: Bento service failures
- **Network errors**: Connection issues

All errors return structured JSON responses with details for debugging.

## Security Considerations

- Use Supabase RLS (Row Level Security) policies for additional data protection
- Validate user input on both client and server sides
- Consider rate limiting and honeypot fields for registration attempts
- Use HTTPS for all API calls
- Store API keys securely in Supabase environment variables

## Troubleshooting

### Common Issues

1. **Email not sending**: Check Bento API credentials and sender address configuration
2. **User creation fails**: Verify database schema and permissions
3. **Function timeout**: Check network connectivity to external APIs
4. **CORS errors**: Ensure proper headers in your client requests

### Debug Tips

- Check Supabase function logs: `supabase functions logs`
- Verify environment variables are set correctly
- Test API endpoints individually
- Check Bento dashboard for email delivery status

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details.