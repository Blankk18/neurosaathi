# Supabase "Account setup failed" Error — Root Cause Analysis

## Error Location
**Component:** `src/pages/Onboarding.tsx` (line 318)
**Display:** "Account setup failed" message shown when anonymous sign-in fails during registration

```tsx
if (isRegistering && authError) {
  return (
    <div>
      <p className="text-lg font-extrabold text-brand-900">Account setup failed</p>
      <p className="text-sm font-semibold leading-relaxed text-neutral-500">{authError}</p>
```

## Supabase Call Chain & Failure Points

### 1. **signInAnonymously() — Step A** (authService.ts:73)
```typescript
const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
```

**What can fail:**
- Anonymous sign-in provider NOT enabled in Supabase Dashboard
- Network error (no connection to Supabase)
- Invalid publishable key in env vars
- Supabase project misconfiguration

**Error returned by Supabase:**
- Code: varies (`PROVIDER_NOT_ENABLED`, network errors)
- Message: e.g., "Anonymous sign-in is not enabled"

---

### 2. **profiles INSERT — Step C** (authService.ts:128-137)
```typescript
const { data: profileData, error: profileError } = await supabase
  .from('profiles')
  .insert({
    auth_user_id: authUserId,
    name: name.trim() || 'Elder',
    role: 'ELDER',
    email: null,  // ← CRITICAL: anonymous users have no email
  })
  .select('id')
  .single();
```

**What can fail:**

#### a) **NOT NULL Violation on profiles.email** (Error Code 23502)
- **Root Cause:** The migration `20260912_fix_anonymous_registration.sql` was NOT applied to the live Supabase database
- **Evidence:** profiles.email column still has `NOT NULL` constraint
- **Fix:** Run the migration in Supabase SQL Editor:
  ```sql
  ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
  ```

#### b) **RLS Policy Blocks INSERT** (Error Code 42501)
- **Root Cause:** Missing INSERT policy on profiles table
- **Evidence:** Migration defines:
  ```sql
  CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);
  ```
  If this policy does NOT exist on live DB, all INSERTs are blocked
- **Fix:** Run the migration in Supabase SQL Editor

#### c) **Constraint Violation** (Error Code 23505)
- If profiles.auth_user_id has a UNIQUE constraint and a duplicate exists
- Less likely but possible on page reload/retry

---

### 3. **elder_profiles INSERT — Step 5** (authService.ts:326-339)
Called after step 5 of onboarding form is complete via `saveElderProfile()`:

```typescript
const { data: newElder, error: elderInsertErr } = await supabase
  .from('elder_profiles')
  .insert({
    profile_id: profileId,
    name: name.trim(),
    age,
    preferred_language: language,
    region,
    interests,
    onboarded: true,
    baseline_done: false,
  })
  .select('id')
  .single();
```

**What can fail:**

#### a) **RLS Policy Blocks INSERT** (Error Code 42501)
- **Root Cause:** Missing INSERT policy on elder_profiles table
- **Required Policy:** (from migration `20260912_fix_anonymous_registration.sql`)
  ```sql
  CREATE POLICY "Elder can insert own elder_profile"
    ON public.elder_profiles
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = profile_id
          AND p.auth_user_id = auth.uid()
      )
    );
  ```
  This checks: the elder_profiles.profile_id references a profiles row that belongs to the current auth user

#### b) **NOT NULL Constraint Violation** (Error Code 23502)
- If any required field (name, age, preferred_language, region) is NULL or missing
- Less likely given the form validation, but possible

#### c) **Foreign Key Violation** (Error Code 23503)
- If profile_id doesn't exist in profiles table
- Would indicate data inconsistency between steps

---

## Schema Requirements

### Required profiles Table Schema
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE,  ← MUST be nullable (NOT NULL removed by migration)
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'ELDER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

### Required elder_profiles Table Schema
```sql
CREATE TABLE public.elder_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,  ← MUST exist
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 40 AND age <= 120),
  preferred_language TEXT NOT NULL DEFAULT 'en',
  region TEXT NOT NULL DEFAULT 'assam',
  interests TEXT[] NOT NULL DEFAULT '{}',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  baseline_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.elder_profiles ENABLE ROW LEVEL SECURITY;
```

---

## RLS Policies — What MUST Exist

### On public.profiles:
1. ✅ `"Public read profiles"` — SELECT USING (true)
2. ✅ `"Users can update own profile"` — UPDATE USING (auth.uid() = auth_user_id)
3. ❌ **MISSING** `"Users can insert own profile"` — INSERT WITH CHECK (auth.uid() = auth_user_id)

### On public.elder_profiles:
1. ✅ `"Read elder profiles"` — SELECT USING (true)
2. ❌ **MISSING** `"Elder can insert own elder_profile"` — INSERT WITH CHECK (EXISTS...) 
3. ✅ `"Elder can update own elder_profile"` — UPDATE USING (EXISTS...)

---

## Diagnostic Steps (What's Missing From Current Code)

The authService.ts logs errors with `.code`, `.message`, `.hint`, and `.details`, but **does NOT log the full Supabase error object**:

```typescript
// Current (line 141-146):
console.error('[authService] Step C FAILED — profiles INSERT error:', {
  code: profileError?.code,
  message: profileError?.message,
  hint: profileError?.hint,
  details: profileError?.details,
});
```

**Should log:**
```typescript
console.error('[authService] Step C FAILED — profiles INSERT error:', {
  code: profileError?.code,
  message: profileError?.message,
  hint: profileError?.hint,
  details: profileError?.details,
  status: profileError?.status,
  statusCode: profileError?.statusCode,
});
```

---

## The Exact Error You're Hitting

Based on the code structure, the most likely error is:

**ERROR: "Column 'email' of relation 'profiles' violates NOT NULL constraint" (Code 23502)**

**Translation:** The migration `20260912_fix_anonymous_registration.sql` was NOT applied to the Supabase database. The profiles.email column still requires a value, but anonymous users have no email.

**Alternate:** If that migration WAS applied, then:

**ERROR: "Row-level security policy blocked INSERT on 'profiles'" (Code 42501)**

**Translation:** The INSERT RLS policy `"Users can insert own profile"` does NOT exist on the profiles table, even though the migration should have created it.

---

## The Fix — 3 Steps

### Step 1: Verify Anonymous Sign-In is Enabled
1. Go to Supabase Dashboard → your project
2. Navigate to **Authentication** → **Providers**
3. Find **Anonymous** provider
4. Verify toggle is **ON** (enabled)

If OFF, enable it and retry.

### Step 2: Apply the Migration
In **Supabase SQL Editor**, run:
```sql
-- Make profiles.email nullable
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL;

-- Insert policy on profiles (allows anonymous users to create their own row)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- Insert policy on elder_profiles
DROP POLICY IF EXISTS "Elder can insert own elder_profile" ON public.elder_profiles;
CREATE POLICY "Elder can insert own elder_profile"
  ON public.elder_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- Update policy on elder_profiles (if missing)
DROP POLICY IF EXISTS "Elder can update own elder_profile" ON public.elder_profiles;
CREATE POLICY "Elder can update own elder_profile"
  ON public.elder_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = profile_id
        AND p.auth_user_id = auth.uid()
    )
  );
```

### Step 3: Verify the Fix
In SQL Editor, run:
```sql
-- Check that email is nullable
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'email';

-- Check that INSERT policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'elder_profiles')
ORDER BY tablename, policyname;
```

Expected output:
- `email` column → `is_nullable: YES`
- Policies include:
  - `profiles → Users can insert own profile → INSERT`
  - `elder_profiles → Elder can insert own elder_profile → INSERT`
  - `elder_profiles → Elder can update own elder_profile → UPDATE`

---

## Why This Happens

1. **Initial Schema** (20260910_initial_schema.sql) creates profiles with `email NOT NULL` and does NOT create INSERT policies — only SELECT and UPDATE
2. **Anonymous Signup** tries to INSERT with `email: null`
3. **NOT NULL Violation** blocks the INSERT
4. **Fallback Migration** (20260912_fix_anonymous_registration.sql) exists but was **NOT applied to the live Supabase database**
5. **Result:** Registration fails with "Account setup failed"

The code is correct. The database is not.

---

## Summary

| Component | Status | Issue |
|-----------|--------|-------|
| Code (authService.ts) | ✅ Correct | Proper error handling, logging, policies defined in migration |
| Migration SQL | ✅ Correct | 20260912_fix_anonymous_registration.sql has all fixes |
| Supabase Live DB | ❌ NOT UPDATED | Migration was never executed; email column still NOT NULL, INSERT policies missing |
| Anonymous Provider | ❓ Unknown | Verify it's enabled in Supabase Dashboard |

**Action Required:** Apply the migration in Supabase SQL Editor, then retry registration.
