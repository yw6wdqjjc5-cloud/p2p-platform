# Platform Automation System

Complete automation layer for the P2P lending platform with daily cron jobs, event logging, and admin analytics.

---

## 🎯 Features Implemented

### 1. Daily Cron Job Endpoint
**Endpoint:** `POST /api/cron/daily`

**Purpose:** Automates daily platform maintenance tasks

**Features:**
- Automatically generates payment schedules for active loans
- Detects and marks overdue payments
- Logs all actions to event_logs table

**Response:**
```json
{
  "success": true,
  "generated": 0,
  "overdue": 0,
  "message": "Cron job completed: 0 payments generated, 0 marked overdue"
}
```

**How to Schedule:**
Use a service like Vercel Cron, GitHub Actions, or any cron service:
```bash
# Example: daily at 00:00 UTC
curl -X POST https://your-domain.com/api/cron/daily
```

---

### 2. Webhook Logger
**Endpoint:** `POST /api/webhooks/log`

**Purpose:** General-purpose webhook endpoint for logging external events

**Request:**
```json
{
  "event_type": "payment_received",
  "data": {
    "amount": 1000,
    "loan_id": "uuid",
    "timestamp": "2025-11-21T08:33:44Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "log_id": "uuid",
  "created_at": "2025-11-21T08:33:45.615953+00:00"
}
```

**Use Cases:**
- Payment gateway webhooks
- Loan status notifications
- External system integrations
- Manual event logging

---

### 3. Admin Analytics Dashboard
**Page:** `/admin/analytics`

**Features:**

#### Key Performance Indicators (KPIs)
- **Total Portfolio Value**: Sum of all loan amounts
- **Total Invested**: Sum of all investments
- **Monthly Interest Flow**: Total monthly interest income
- **Active Loans**: Count of published loans
- **Funded Loans**: Count of funded loans
- **Overdue Payments**: Count of overdue payments

#### Payment Status Visualization
- Table with counts and visual bars for:
  - Pending payments
  - Paid payments
  - Overdue payments

**Access:** Navigate to `http://localhost:3000/admin/analytics`

---

### 4. Automatic Event Logging

All critical platform actions are now automatically logged to the `event_logs` table:

#### Investment Created
```json
{
  "event_type": "investment_created",
  "data": {
    "investment_id": "uuid",
    "loan_id": "uuid",
    "investor_email": "test@investor.com",
    "amount": 500000,
    "total_invested": 1000000,
    "fully_funded": false
  }
}
```

#### Payment Generated
```json
{
  "event_type": "payment_generated",
  "data": {
    "loan_id": "uuid",
    "payments_created": 12,
    "investments_count": 3,
    "term_months": 12
  }
}
```

#### Payment Marked Paid
```json
{
  "event_type": "payment_marked_paid",
  "data": {
    "payment_id": "uuid",
    "previous_status": "pending",
    "paid_at": "2025-11-21T08:33:45.615953Z"
  }
}
```

#### Risk Scored
```json
{
  "event_type": "risk_scored",
  "data": {
    "loan_id": "uuid",
    "risk_score_id": "uuid",
    "score": 75,
    "risk_level": "low",
    "mock_mode": false,
    "model_version": "gpt-4o-mini"
  }
}
```

#### Daily Cron Execution
```json
{
  "event_type": "cron_daily",
  "data": {
    "generated_payments_count": 0,
    "overdue_count": 0,
    "execution_time": "2025-11-21T08:34:02.878Z"
  }
}
```

---

## 📊 Database Schema

### event_logs Table
```sql
create table if not exists public.event_logs (
    id uuid primary key default uuid_generate_v4(),
    event_type text not null,
    data jsonb,
    created_at timestamptz default now()
);

create index if not exists idx_event_logs_event_type on public.event_logs (event_type);
create index if not exists idx_event_logs_created_at on public.event_logs (created_at);
```

---

## 🚀 Testing the System

### 1. Test Webhook Logger
```bash
curl -X POST http://localhost:3000/api/webhooks/log \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test_webhook","data":{"message":"Testing"}}'
```

**Expected Response:**
```json
{
  "success": true,
  "log_id": "uuid",
  "created_at": "2025-11-21T08:33:45.615953+00:00"
}
```

### 2. Test Daily Cron Job
```bash
curl -X POST http://localhost:3000/api/cron/daily \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "generated": 0,
  "overdue": 0,
  "message": "Cron job completed: 0 payments generated, 0 marked overdue"
}
```

### 3. View Analytics Dashboard
Open browser: `http://localhost:3000/admin/analytics`

You should see:
- KPI cards with platform metrics
- Payment status table with visual bars
- All values should update in real-time based on database state

### 4. Verify Event Logs
Query the database:
```sql
SELECT * FROM event_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

Or use the verification script:
```bash
node verify-event-logs.js
```

---

## 🔧 Configuration

### Environment Variables
All endpoints use `supabaseAdmin` from `lib/supabase.ts`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No additional configuration required.

### Cron Schedule (Production)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## 📈 Monitoring & Observability

### Event Types to Monitor
1. `cron_daily` - Daily automation execution
2. `cron_daily_error` - Cron job failures
3. `investment_created` - New investments
4. `payment_generated` - Payment schedules created
5. `payment_marked_paid` - Payments confirmed
6. `risk_scored` - AI risk assessments

### Query Examples

**Count events by type (last 24h):**
```sql
SELECT event_type, COUNT(*) 
FROM event_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY COUNT(*) DESC;
```

**Recent errors:**
```sql
SELECT * 
FROM event_logs 
WHERE event_type LIKE '%error%'
ORDER BY created_at DESC
LIMIT 10;
```

**Daily automation health:**
```sql
SELECT 
  DATE(created_at) as date,
  data->>'generated_payments_count' as generated,
  data->>'overdue_count' as overdue
FROM event_logs 
WHERE event_type = 'cron_daily'
ORDER BY created_at DESC
LIMIT 7;
```

---

## ✅ Implementation Checklist

- [x] Daily cron job endpoint (`/api/cron/daily`)
- [x] Webhook logger endpoint (`/api/webhooks/log`)
- [x] Admin analytics page (`/admin/analytics`)
- [x] Event logging in `investments/create`
- [x] Event logging in `payments/generate`
- [x] Event logging in `payments/mark-paid`
- [x] Event logging in `ai/risk-score`
- [x] Automatic payment generation for active loans
- [x] Automatic overdue detection
- [x] KPI calculation and display
- [x] Payment status visualization
- [x] Error handling and logging

---

## 🎉 Success Criteria

All features tested and working:
1. ✅ Webhook logger accepts and stores events
2. ✅ Daily cron job executes without errors
3. ✅ Admin analytics page renders with correct data
4. ✅ Event logs are created for all major actions
5. ✅ No linter errors in new code
6. ✅ All endpoints return proper JSON responses
7. ✅ Database queries are optimized with proper joins

---

## 📝 Notes

- Event logs use JSONB for flexible data storage
- All timestamps are in UTC
- Cron job is idempotent (safe to run multiple times)
- Analytics calculations use default interest rate (2%) when not set
- Webhook logger has no authentication (add in production)
- Event logs table has indexes on `event_type` and `created_at`

---

**Implementation Date:** November 21, 2025  
**Status:** ✅ Complete and Tested


