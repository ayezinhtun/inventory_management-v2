# IMS — Inventory Management System (v2)

A full-stack inventory management system for 1CNG built with React 18, TypeScript, Vite, Zustand, Supabase, and Tailwind CSS.

---

## Quick Start

```bash
npm install
npm run dev
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required — Supabase project credentials
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Notification Service Setup

IMS uses **[Resend](https://resend.com)** for real email delivery (free tier: 3,000 emails/month, 100/day).

### Step 1 — Get a Free Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your sending domain (or use the sandbox `onboarding@resend.dev` for testing)
3. Create an API key with **Sending access** from the API Keys dashboard
4. Copy the key (starts with `re_...`)

### Step 2 — Configure Supabase Edge Function Secrets

Set the following secrets in your Supabase project:

```bash
# Using Supabase CLI
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
npx supabase secrets set FROM_EMAIL=noreply@yourdomain.com
```

Or via the Supabase Dashboard → Project Settings → Edge Functions → Secrets.

| Variable         | Description                                           | Example                  |
|------------------|-------------------------------------------------------|--------------------------|
| `RESEND_API_KEY` | Your Resend API key                                   | `re_abc123...`           |
| `FROM_EMAIL`     | Verified sender address (must be verified in Resend)  | `noreply@yourdomain.com` |

> **Dev mode**: If `RESEND_API_KEY` is not set, the function logs `dev-skip` and marks emails as "sent" without actually sending. This lets you develop without a key.

### Step 3 — Deploy the Edge Function

```bash
npx supabase functions deploy send-notification
```

### Step 4 — Apply Database Migrations

```bash
npx supabase db push
```

This creates:
- `public.notifications` — in-app notification records
- `public.email_logs` — email delivery tracking
- `public.notification_templates` — reusable email templates (pre-seeded with low_stock_alert, monthly_summary, welcome)

---

## Monthly Auto-Email Setup

To send monthly inventory summary emails automatically, set up a scheduled job using Supabase's `pg_cron` extension.

### Step 1 — Enable pg_cron

Go to **Supabase Dashboard → Database → Extensions** and enable `pg_cron`.

### Step 2 — Create the Cron Job

Run this SQL in the **SQL Editor**:

```sql
-- Run on the 1st of every month at 08:00 UTC
SELECT cron.schedule(
  'monthly-inventory-summary',
  '0 8 1 * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_url') || '/functions/v1/send-notification',
    body    := jsonb_build_object(
      'broadcast', true,
      'title', 'Monthly Inventory Summary',
      'message', 'Your monthly inventory report is ready. Log in to IMS to view the full report.',
      'type', 'info',
      'category', 'system',
      'send_email', true,
      'email_subject', 'Monthly Inventory Summary — ' || to_char(now(), 'Month YYYY')
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  );
  $$
);
```

> Adjust the cron schedule to any interval. Use [crontab.guru](https://crontab.guru) to build expressions.
> Common schedules: `0 8 1 * *` (monthly), `0 8 * * 1` (weekly Monday), `0 8 * * *` (daily).

---

## Features

### Dashboard
- Real-time metrics pulled directly from Supabase (no mock data)
- Cards: Total Components, Asset Value, Active Users, Total Customers, Regions, Warehouses, Component Types, Units, Broken, Low Stock
- Alert banners for broken components and low stock (only shown when issues exist)
- Overview tab: key metrics + recent activity + low stock list
- Analytics tab: status donut, region bar chart, type donut, region breakdown table
- Role-based filtering (non-Admins only see their assigned region's data)

### Notifications
- In-app notifications stored in Supabase with real-time delivery via Postgres Changes
- Admin Notification Center with three tabs:
  - **Inbox** — all notifications with read/unread toggle
  - **Compose** — send to: broadcast all, filter by region, filter by role; optional email delivery
  - **Email Logs** — delivery history with status (sent/failed/pending) and error details
- Unread badge on the bell icon (live count from Supabase)
- Region/Warehouse-based filtering built into the notification model

### Other Modules
- Inventory Management (hardware assets)
- Component Tracking (types, regions, warehouses, status, stock levels)
- Customer Management
- User Management (Admin-only, via Edge Function)
- Audit Logging (all CRUD operations across all modules)
- Regions & Warehouses

---

## Deploying to Supabase

```bash
# 1. Push all DB migrations (creates tables, RLS policies)
npx supabase db push

# 2. Deploy Edge Functions
npx supabase functions deploy admin-user-actions
npx supabase functions deploy send-notification

# 3. Set Edge Function secrets
npx supabase secrets set RESEND_API_KEY=re_your_key_here
npx supabase secrets set FROM_EMAIL=noreply@yourdomain.com
```

---

## Troubleshooting

### Emails not sending
1. Check `RESEND_API_KEY` is set: `npx supabase secrets list`
2. Verify the `FROM_EMAIL` domain is verified in your Resend dashboard
3. Check the **Email Logs** tab in the Notification Center for error messages
4. Check Supabase Edge Function logs: Dashboard → Edge Functions → `send-notification` → Logs

### Notifications not appearing in real-time
1. Ensure DB migrations are applied: `npx supabase db push`
2. Check browser console for Supabase realtime errors
3. Verify the user has an active session

### Dashboard shows no data
1. Check RLS policies are applied (run `npx supabase db push`)
2. Verify `components`, `regions`, `warehouses`, `customers`, `user_profiles` tables exist
3. Check browser console for Supabase query errors

### Components table missing
Run: `npx supabase db push` to apply migration `20260422000005_ensure_components_table.sql`

### Create User not working
Deploy the Edge Function: `npx supabase functions deploy admin-user-actions`
