-- Create investments table for tracking investor contributions to loans
create table if not exists public.investments (
    id uuid primary key default uuid_generate_v4(),
    loan_id uuid references public.loans(id) not null,
    investor_email text not null,
    amount numeric not null check (amount > 0),
    created_at timestamptz default now()
);

-- Create index for faster lookups
create index if not exists idx_investments_loan_id on public.investments (loan_id);
create index if not exists idx_investments_investor_email on public.investments (investor_email);

-- Add comment
comment on table public.investments is 'Tracks individual investments made by investors into loans';


