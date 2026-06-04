-- Legal Hold Dual-Authorization: add authorized_by column for release

ALTER TABLE public.vault_holds ADD COLUMN IF NOT EXISTS authorized_by VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_vault_holds_authorized_by ON public.vault_holds(authorized_by);
