DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE u record; meta jsonb; atype text; cid uuid;
BEGIN
  FOR u IN SELECT * FROM auth.users au WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id) LOOP
    meta := coalesce(u.raw_user_meta_data, '{}');
    atype := coalesce(meta->>'account_type','purchaser');
    IF atype NOT IN ('purchaser','supplier') THEN atype := 'purchaser'; END IF;
    INSERT INTO public.profiles(id, account_type, full_name, email, phone) VALUES (u.id, atype, meta->>'full_name', u.email, meta->>'phone');
    IF atype = 'supplier' THEN
      INSERT INTO public.suppliers(user_id, company_name, email, phone, address, gstin, categories)
      VALUES (u.id, coalesce(meta->>'company_name','Supplier'), lower(u.email), meta->>'phone', meta->>'address', nullif(meta->>'gstin',''),
        coalesce(array(select jsonb_array_elements_text(meta->'categories')), '{}'));
    ELSE
      INSERT INTO public.companies(name, email, phone, address) VALUES (coalesce(meta->>'company_name','My Company'), u.email, meta->>'phone', meta->>'address') RETURNING id INTO cid;
      INSERT INTO public.company_members(company_id, user_id, role) VALUES (cid, u.id, 'admin');
    END IF;
  END LOOP;
END $$;