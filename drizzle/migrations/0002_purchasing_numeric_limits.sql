ALTER TABLE public.purchase_requests ADD CONSTRAINT purchase_requests_budget_limits CHECK (budget > 0 AND budget <= 1000000000), ADD CONSTRAINT purchase_requests_quantity_limits CHECK (quantity > 0 AND quantity <= 1000000 AND quantity = trunc(quantity));
ALTER TABLE public.quotations ADD CONSTRAINT quotations_unit_price_limits CHECK (unit_price > 0 AND unit_price <= 1000000000);
ALTER TABLE public.companies ADD CONSTRAINT companies_annual_budget_limits CHECK (annual_budget > 0 AND annual_budget <= 1000000000) NOT VALID;
COMMENT ON CONSTRAINT companies_annual_budget_limits ON public.companies IS 'Enforces positive yearly budgets up to INR 100 crore for all new inserts and updates. Existing unset budgets require an admin-entered budget before validation.';
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare meta jsonb := coalesce(new.raw_user_meta_data,'{}'); atype text; inv record; cid uuid; yearly_budget numeric;
begin
  atype := coalesce(meta->>'account_type','purchaser');
  if atype not in ('purchaser','supplier') then atype := 'purchaser'; end if;
  insert into public.profiles(id, account_type, full_name, email, phone)
    values (new.id, atype, meta->>'full_name', new.email, meta->>'phone');
  if atype = 'supplier' then
    insert into public.suppliers(user_id, company_name, email, phone, address, gstin, categories)
    values (new.id, coalesce(meta->>'company_name','Supplier'), lower(new.email), meta->>'phone', meta->>'address', nullif(meta->>'gstin',''),
      coalesce(array(select jsonb_array_elements_text(meta->'categories')), '{}'));
  else
    select * into inv from public.company_invites where lower(email) = lower(new.email) and not accepted order by created_at limit 1;
    if found then
      insert into public.company_members(company_id, user_id, role) values (inv.company_id, new.id, inv.role);
      update public.company_invites set accepted = true where id = inv.id;
    else
      begin
        yearly_budget := (meta->>'annual_budget')::numeric;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Yearly budget must be a positive number up to INR 1,000,000,000 (100 crore)';
      end;
      if yearly_budget is null or not (yearly_budget > 0 and yearly_budget <= 1000000000) then
        raise exception 'Yearly budget must be a positive number up to INR 1,000,000,000 (100 crore)';
      end if;
      insert into public.companies(name, email, phone, address, annual_budget) values (coalesce(meta->>'company_name','My Company'), new.email, meta->>'phone', meta->>'address', yearly_budget) returning id into cid;
      insert into public.company_members(company_id, user_id, role) values (cid, new.id, 'admin');
    end if;
  end if;
  return new;
end $function$;