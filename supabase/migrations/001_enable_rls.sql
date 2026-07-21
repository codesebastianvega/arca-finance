-- Script Seguro para Habilitar y Configurar RLS (Row-Level Security)
-- 1. Agregar workspace_id a tablas hijas (Desnormalización para RLS)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transaction_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transaction_items' AND column_name='workspace_id') THEN
            ALTER TABLE transaction_items ADD COLUMN workspace_id uuid REFERENCES workspaces(id);
        END IF;
    END IF;
END $$;

-- 2. Habilitar RLS solo si las tablas existen
DO $$
DECLARE
    tbl text;
    tables_to_check text[] := ARRAY[
        'workspaces', 'workspace_members', 'workspace_subscriptions', 'profiles', 
        'accounts', 'credit_cards', 'expense_categories', 'income_sources', 
        'business_units', 'scheduled_events', 'receivables', 'savings_goals', 
        'transactions', 'bank_credits', 'monthly_plans', 'monthly_plan_allocations', 
        'transaction_items', 'income_templates', 'expense_templates', 'savings_transactions'
    ];
BEGIN
    FOR tbl IN SELECT unnest(tables_to_check) LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        END IF;
    END LOOP;
END $$;


-- 3. Función auxiliar segura (Reutilizable)
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Políticas Dinámicas
DO $$
DECLARE
    tbl text;
    tables_to_check text[] := ARRAY[
        'accounts', 'credit_cards', 'expense_categories', 'income_sources', 
        'business_units', 'scheduled_events', 'receivables', 'savings_goals', 
        'transactions', 'bank_credits', 'monthly_plans', 'monthly_plan_allocations', 
        'transaction_items', 'income_templates', 'expense_templates', 'savings_transactions'
    ];
BEGIN
    -- Politicas para Profiles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING ( auth.uid() = id );
        
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING ( auth.uid() = id );
    END IF;

    -- Politicas para Workspaces
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspaces') THEN
        DROP POLICY IF EXISTS "Users view workspaces" ON workspaces;
        CREATE POLICY "Users view workspaces" ON workspaces FOR SELECT USING ( public.is_workspace_member(id) );
        
        DROP POLICY IF EXISTS "Users create workspaces" ON workspaces;
        CREATE POLICY "Users create workspaces" ON workspaces FOR INSERT WITH CHECK ( auth.uid() = owner_user_id );
        
        DROP POLICY IF EXISTS "Users update workspaces" ON workspaces;
        CREATE POLICY "Users update workspaces" ON workspaces FOR UPDATE USING ( public.is_workspace_member(id) );
    END IF;

    -- Politicas para Workspace Members
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_members') THEN
        DROP POLICY IF EXISTS "Users view memberships" ON workspace_members;
        CREATE POLICY "Users view memberships" ON workspace_members FOR SELECT USING ( user_id = auth.uid() );
        
        DROP POLICY IF EXISTS "Users insert memberships" ON workspace_members;
        CREATE POLICY "Users insert memberships" ON workspace_members FOR INSERT WITH CHECK ( auth.uid() = user_id );
    END IF;

    -- Politicas para Suscripciones
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_subscriptions') THEN
        DROP POLICY IF EXISTS "Users view subscriptions" ON workspace_subscriptions;
        CREATE POLICY "Users view subscriptions" ON workspace_subscriptions FOR SELECT USING ( public.is_workspace_member(workspace_id) );
    END IF;

    -- Bucle para tablas de recursos con workspace_id
    FOR tbl IN SELECT unnest(tables_to_check) LOOP
        -- Verifica que la tabla EXISTA y que tenga la columna workspace_id
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = tbl 
              AND column_name = 'workspace_id'
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Users access %I" ON %I;', tbl, tbl);
            EXECUTE format('CREATE POLICY "Users access %I" ON %I FOR ALL USING ( public.is_workspace_member(workspace_id) );', tbl, tbl);
        END IF;
    END LOOP;
END $$;
