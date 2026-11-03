-- DRAFT ONLY — DO NOT APPLY TO PRODUCTION.
-- Review with the legally responsible adult/operator and test on a Supabase branch first.
-- This file is a design artifact, not an active migration.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- The legacy public profile role is not a trusted authorization source.
create or replace function private.guard_profile_role_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    if tg_op = 'INSERT' and new.role is distinct from 'user' then
      raise exception 'profile_role_assignment_requires_trusted_provisioning'
        using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'profile_role_change_requires_trusted_provisioning'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_profile_role_changes() from public, anon, authenticated;

drop trigger if exists profiles_guard_role_changes on public.profiles;
create trigger profiles_guard_role_changes
before insert or update of role on public.profiles
for each row execute function private.guard_profile_role_changes();

create table if not exists private.agency_finance_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists private.agency_creators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended', 'ended')),
  adult_eligibility_verified_at timestamptz,
  agreement_verified_at timestamptz,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'active' or (
    adult_eligibility_verified_at is not null
    and agreement_verified_at is not null
    and approved_by is not null
    and approved_at is not null
  ))
);

create table if not exists private.payout_methods (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references private.agency_creators(user_id) on delete restrict,
  provider text not null check (provider in ('orange_money', 'wave', 'moov_money')),
  recipient_phone_ciphertext bytea not null,
  holder_name_ciphertext bytea,
  phone_last4 text not null check (phone_last4 ~ '^[0-9]{4}$'),
  active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.creator_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references private.agency_creators(user_id) on delete restrict,
  direction text not null check (direction in ('credit', 'debit')),
  category text not null check (category in ('earning', 'bonus', 'adjustment', 'payout')),
  amount_xof bigint not null check (amount_xof > 0),
  description text not null,
  reference text,
  idempotency_key text not null unique,
  created_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists private.payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references private.agency_creators(user_id) on delete restrict,
  payout_method_id uuid not null references private.payout_methods(id) on delete restrict,
  amount_xof bigint not null check (amount_xof >= 5000),
  provider text not null check (provider in ('orange_money', 'wave', 'moov_money')),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'paid', 'cancelled')),
  request_idempotency_key text not null unique,
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  rejection_reason text,
  paid_at timestamptz,
  provider_reference text,
  created_at timestamptz not null default now(),
  check (
    (status <> 'paid') or (paid_at is not null and provider_reference is not null)
  )
);

create table if not exists private.payout_audit_log (
  id uuid primary key default gen_random_uuid(),
  payout_request_id uuid references private.payout_requests(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Private finance data is never directly accessible to anon/authenticated.
alter table private.agency_finance_admins enable row level security;
alter table private.agency_creators enable row level security;
alter table private.payout_methods enable row level security;
alter table private.creator_wallet_ledger enable row level security;
alter table private.payout_requests enable row level security;
alter table private.payout_audit_log enable row level security;

revoke all on all tables in schema private from public, anon, authenticated;
grant select, insert, update on private.agency_finance_admins to service_role;
grant select, insert, update on private.agency_creators to service_role;
grant select, insert, update on private.payout_methods to service_role;
grant select, insert on private.creator_wallet_ledger to service_role;
grant select, insert, update on private.payout_requests to service_role;
grant select, insert on private.payout_audit_log to service_role;

commit;

-- Before production use, add reviewed server-only RPC/transaction routines for:
-- 1) authenticated creator eligibility + method management;
-- 2) atomic balance reservation with row locking;
-- 3) admin approval/rejection via private.agency_finance_admins;
-- 4) idempotent "mark paid" + debit ledger append + audit event in one transaction.
-- Never expose a SECURITY DEFINER function to anon/authenticated by default.
