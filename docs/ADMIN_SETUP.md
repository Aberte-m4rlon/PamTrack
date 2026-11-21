# Administrator Setup Instructions

For strict security, the application **never** auto-creates default administrator accounts or embeds admin credentials in frontend code. Every newly registered account starts as a standard `commuter`.

## Bootstrapping Your First Super Administrator

1. Deploy your Supabase schema (`001`–`006`) and start the frontend app.
2. Register your primary administrator account normally through `/register` (and verify its email address).
3. Open your **Supabase Dashboard → SQL Editor** (runs with privileged postgres role) and execute:

```sql
UPDATE public.user_roles
   SET role = 'super_administrator',
       reason = 'Initial production Super Administrator bootstrap'
 WHERE user_id = (
   SELECT id FROM public.profiles WHERE email = 'your-admin-email@example.com'
 );
```

4. Sign out and sign back in on the web app. The **Administrator Portal** (`/admin`) will automatically unlock in the navigation shell.
5. From `/admin/users`, the Super Administrator can securely promote or demote other verified staff accounts (`administrator`, `transport_operator`, `commuter`) with full `audit_logs` tracking.
