-- Script para crear Funciones (RPC) Atómicas en Supabase
-- Ejecuta este script en tu SQL Editor para evitar Race Conditions.

-- 1. Actualizar saldo de Cuenta Corriente/Ahorros
CREATE OR REPLACE FUNCTION public.increment_account_balance(
  p_account_id uuid,
  p_amount numeric,
  p_allow_negative boolean DEFAULT false
) RETURNS numeric AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE accounts 
  SET balance = balance + p_amount 
  WHERE id = p_account_id
  RETURNING balance INTO v_new_balance;

  IF NOT p_allow_negative AND v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_FUNDS: La cuenta no tiene saldo suficiente para confirmar este movimiento.';
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. Actualizar saldo usado de Tarjeta de Crédito
CREATE OR REPLACE FUNCTION public.increment_credit_card_used(
  p_card_id uuid,
  p_amount numeric
) RETURNS numeric AS $$
DECLARE
  v_new_used numeric;
  v_limit numeric;
BEGIN
  -- Actualiza el saldo usado y obtiene el límite de la tarjeta al mismo tiempo
  UPDATE credit_cards 
  SET used = used + p_amount 
  WHERE id = p_card_id
  RETURNING used, "limit" INTO v_new_used, v_limit;

  IF v_new_used > v_limit THEN
    RAISE EXCEPTION 'OVER_LIMIT: El uso de la tarjeta excede el límite permitido.';
  END IF;
  
  -- Evitar "deuda" negativa irracional (a menos que haya saldo a favor)
  -- En caso de tarjetas, permitimos saldo a favor, así que no lanzamos error si used < 0.

  RETURN v_new_used;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Actualizar saldo de Receivables (Préstamos a terceros)
CREATE OR REPLACE FUNCTION public.increment_receivable_balance(
  p_receivable_id uuid,
  p_amount numeric
) RETURNS numeric AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE receivables 
  SET current_balance = current_balance + p_amount 
  WHERE id = p_receivable_id
  RETURNING current_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. Actualizar saldo de Créditos Bancarios (Bank Credits)
CREATE OR REPLACE FUNCTION public.increment_bank_credit_balance(
  p_credit_id uuid,
  p_amount numeric
) RETURNS numeric AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  UPDATE bank_credits 
  SET current_balance = current_balance + p_amount 
  WHERE id = p_credit_id
  RETURNING current_balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Actualizar ahorro de Metas de Ahorro (Savings Goals)
CREATE OR REPLACE FUNCTION public.increment_savings_goal_current(
  p_goal_id uuid,
  p_amount numeric
) RETURNS numeric AS $$
DECLARE
  v_new_current numeric;
BEGIN
  UPDATE savings_goals 
  SET current = current + p_amount 
  WHERE id = p_goal_id
  RETURNING current INTO v_new_current;

  RETURN v_new_current;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
