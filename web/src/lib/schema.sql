-- Users are handled by Supabase Auth

-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  university text,
  major text,
  year_of_study int,
  is_pro boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Courses table
create table courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  code text,
  professor text,
  credits int default 3,
  semester text,
  year int,
  color text default '#7C3AED',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Grade categories (e.g. Homework 30%, Midterm 30%, Final 40%)
create table grade_categories (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references courses(id) on delete cascade not null,
  name text not null,
  weight numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Individual assignments/grades
create table assignments (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references grade_categories(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  grade numeric,
  max_grade numeric default 100,
  completed boolean default false,
  due_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Professor ratings
create table professor_ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  professor_name text not null,
  university text not null,
  course_code text,
  rating numeric check (rating >= 1 and rating <= 5),
  difficulty numeric check (difficulty >= 1 and difficulty <= 5),
  review text,
  would_take_again boolean,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row Level Security
alter table profiles enable row level security;
alter table courses enable row level security;
alter table grade_categories enable row level security;
alter table assignments enable row level security;
alter table professor_ratings enable row level security;

-- Policies: users can only see their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can crud own courses" on courses for all using (auth.uid() = user_id);
create policy "Users can crud own categories" on grade_categories for all using (
  auth.uid() = (select user_id from courses where id = course_id)
);
create policy "Users can crud own assignments" on assignments for all using (auth.uid() = user_id);

-- Professor ratings are public to read, private to write
create policy "Anyone can read ratings" on professor_ratings for select using (true);
create policy "Users can write own ratings" on professor_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update own ratings" on professor_ratings for update using (auth.uid() = user_id);
create policy "Users can delete own ratings" on professor_ratings for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
