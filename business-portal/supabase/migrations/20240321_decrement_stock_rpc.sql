-- Postgres function to atomically decrement stock (prevent negative stock)
CREATE OR REPLACE FUNCTION decrement_stock(row_id uuid, qty integer)
RETURNS void AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = GREATEST(stock_quantity - qty, 0)
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
