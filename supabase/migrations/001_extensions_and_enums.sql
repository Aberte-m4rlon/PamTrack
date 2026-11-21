-- ============================================================================
-- 001_extensions_and_enums.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Extensions, domain enums, and shared trigger utility functions.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User authorization roles (enforced via user_roles + RLS + RPCs)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM (
      'guest',
      'commuter',
      'transport_operator',
      'administrator',
      'super_administrator'
    );
  END IF;
END $$;

-- Fare record verification & transparency status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fare_status') THEN
    CREATE TYPE public.fare_status AS ENUM (
      'verified_official',
      'community_estimate',
      'pending_verification',
      'rejected_or_disputed',
      'archived'
    );
  END IF;
END $$;

-- Community fare report moderation workflow status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE public.report_status AS ENUM (
      'pending',
      'under_review',
      'approved_community_estimate',
      'verified_official',
      'rejected',
      'disputed'
    );
  END IF;
END $$;

-- Passenger discount / fare categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'passenger_category') THEN
    CREATE TYPE public.passenger_category AS ENUM (
      'regular',
      'student',
      'senior_citizen',
      'pwd'
    );
  END IF;
END $$;

-- Notification event categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'report_submitted',
      'report_approved',
      'report_rejected',
      'verification_completed',
      'official_fare_updated',
      'announcement'
    );
  END IF;
END $$;

-- Shared updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;
