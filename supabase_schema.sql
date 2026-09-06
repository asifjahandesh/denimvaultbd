-- Database schema for Denim Vault BD eCommerce Landing Page and Admin Panel

-- Enable uuid-ossp extension
create extension if not exists "uuid-ossp";

-- 1. PRODUCTS TABLE
create table if not exists public.products (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    price numeric(10, 2) not null,
    discount_price numeric(10, 2),
    stock integer not null default 0,
    category text not null default 'General',
    image_urls text[] not null default '{}'::text[],
    is_free_delivery boolean not null default false,
    entry_stock integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration for existing database (Run in Supabase SQL Editor if needed):
-- alter table public.products add column if not exists is_free_delivery boolean not null default false;
-- alter table public.products add column if not exists entry_stock integer not null default 0;

-- 2. CUSTOMERS TABLE
create table if not exists public.customers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    phone text not null unique,
    address text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. ORDERS TABLE
create table if not exists public.orders (
    id uuid default gen_random_uuid() primary key,
    customer_name text not null,
    phone text not null,
    address text not null,
    product_name text not null,
    product_variant text,
    quantity integer not null default 1,
    total_price numeric(10, 2) not null,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'processing', 'delivered', 'cancelled')),
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. SETTINGS TABLE
create table if not exists public.settings (
    key text primary key,
    value jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. REVIEWS TABLE
create table if not exists public.reviews (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    comment text not null,
    rating integer not null default 5 check (rating >= 1 and rating <= 5),
    location text default 'বাংলাদেশ',
    is_hidden boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexing for performance
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_orders_phone on public.orders(phone);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_reviews_created_at on public.reviews(created_at desc);

-- 5. FUNCTION & TRIGGER TO AUTO-UPDATE CUSTOMERS ON ORDER CHECKOUT
create or replace function public.handle_customer_on_order()
returns trigger as $$
begin
    insert into public.customers (name, phone, address)
    values (new.customer_name, new.phone, new.address)
    on conflict (phone) 
    do update set 
        name = excluded.name, 
        address = excluded.address,
        created_at = now();
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger trigger_handle_customer_on_order
after insert on public.orders
for each row
execute function public.handle_customer_on_order();

-- 6. SEED DEFAULT SETTINGS
insert into public.settings (key, value)
values 
('shop_info', '{"name": "Denim Vault BD", "email": "info@denimvaultbd.com", "phone": "+8801700000000", "address": "ঢাকা, বাংলাদেশ", "description": "সেরা কোয়ালিটির ডেনিম ও ফ্যাশন পণ্য সাশ্রয়ী মূল্যে সরাসরি আপনার দ্বারে।", "promo_text": "৫0% পর্যন্ত ছাড় এবং ফ্রি ডেলিভারি অফার!"}'),
('delivery_charges', '{"inside_dhaka": 60, "outside_dhaka": 120}'),
('social_links', '{"facebook": "https://facebook.com/denimvaultbd", "whatsapp": "+8801700000000"}')
on conflict (key) do nothing;

-- 7. DISABLE ROW LEVEL SECURITY (RLS) FOR SIMPLE PASSWORD-ONLY CONFIGURATION
-- This allows database operations to succeed from the anonymous admin dashboard.
alter table public.products disable row level security;
alter table public.customers disable row level security;
alter table public.orders disable row level security;
alter table public.settings disable row level security;
alter table public.reviews disable row level security;

-- 8. ENABLE REALTIME PUBLICATION FOR INSTANT WEB UPDATES
-- We use a PL/pgSQL block to conditionally add tables to avoid duplicate_object errors if run multiple times.
do $$
begin
  begin
    alter publication supabase_realtime add table public.settings;
  exception
    when duplicate_object then null;
    when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.products;
  exception
    when duplicate_object then null;
    when others then null;
  end;

  begin
    alter publication supabase_realtime add table public.reviews;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;


