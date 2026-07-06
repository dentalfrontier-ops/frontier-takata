create extension if not exists "uuid-ossp";

create table if not exists facilities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  phone text,
  memo text,
  created_at timestamptz default now()
);

create table if not exists patients (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid references facilities(id) on delete set null,
  name text not null,
  room text,
  memo text,
  created_at timestamptz default now()
);

create table if not exists schedules (
  id uuid primary key default uuid_generate_v4(),
  facility_id uuid references facilities(id) on delete set null,
  patient_names text[] not null default '{}',
  treatment text not null,
  start_at timestamptz not null,
  memo text,
  created_at timestamptz default now()
);

alter table facilities enable row level security;
alter table patients enable row level security;
alter table schedules enable row level security;

drop policy if exists "read facilities" on facilities;
drop policy if exists "write facilities" on facilities;
drop policy if exists "read patients" on patients;
drop policy if exists "write patients" on patients;
drop policy if exists "read schedules" on schedules;
drop policy if exists "write schedules" on schedules;

create policy "read facilities" on facilities for select using (true);
create policy "write facilities" on facilities for all using (true) with check (true);
create policy "read patients" on patients for select using (true);
create policy "write patients" on patients for all using (true) with check (true);
create policy "read schedules" on schedules for select using (true);
create policy "write schedules" on schedules for all using (true) with check (true);

insert into facilities (name) values
('ラ・ナシカ乙金'),
('オリーブの木ひばる'),
('グランメゾン迎賓館小笹'),
('グランヴィル鳳凰館周船寺'),
('野多目'),
('和寿苑'),
('マナハウス');
