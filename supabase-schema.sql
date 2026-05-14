create extension if not exists pgcrypto;

create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('cafe', 'shop')),
  address text,
  latitude double precision not null,
  longitude double precision not null,
  info text,
  hours jsonb not null default '[]',
  present_count integer not null default 0,
  absent_count integer not null default 0,
  last_report_status text check (last_report_status in ('present', 'absent')),
  last_reported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists places_name_unique on places (name);

insert into places (name, type, address, latitude, longitude, info, hours)
values
  (
    'Korsakov',
    'cafe',
    'Sint-Jorispoort 1, 2000 Antwerpen',
    51.229,
    4.414,
    'Club Mate verkrijgbaar',
    '[[{"open":"12:00","close":"02:00"}],[{"open":"12:00","close":"02:00"}],[{"open":"12:00","close":"03:00"}],[{"open":"12:00","close":"03:00"}],[{"open":"12:00","close":"03:00"}],[{"open":"12:00","close":"04:00"}],[{"open":"12:00","close":"04:00"}]]'
  ),
  (
    'Ampere',
    'cafe',
    'Simonsstraat 21, 2018 Antwerpen',
    51.221,
    4.4,
    'Vaak Club Mate Zero',
    '[[],[],[],[],[],[{"open":"23:00","close":"07:00"}],[{"open":"23:00","close":"07:00"}]]'
  ),
  (
    'Carrefour',
    'shop',
    'Beddenstraat 2, 2000 Antwerpen',
    51.217,
    4.421,
    'Supermarkt met Club Mate',
    '[[],[{"open":"08:00","close":"20:00"}],[{"open":"08:00","close":"20:00"}],[{"open":"08:00","close":"20:00"}],[{"open":"08:00","close":"20:00"}],[{"open":"08:00","close":"21:00"}],[{"open":"08:00","close":"20:00"}]]'
  )
on conflict (name) do nothing;
