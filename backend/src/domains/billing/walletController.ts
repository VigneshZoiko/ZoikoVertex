import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../../shared/supabase';
import { AuthRequest } from '../../shared/authMiddleware';

export const getWalletData = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) {
    return res.status(400).json({ success: false, error: 'Missing workspace context' });
  }

  try {
    // Get wallet
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (walletError || !wallet) {
      return res.status(200).json({
        success: true,
        data: {
          wallet: { balance: 0, currency: 'USD', auto_topup_enabled: false, auto_topup_threshold: 50, auto_topup_amount: 500 },
          transactions: []
        }
      });
    }

    // Get transactions with campaign name
    const { data: transactions } = await supabaseAdmin
      .from('wallet_transactions')
      .select(`
        id,
        amount,
        type,
        description,
        created_at,
        campaigns ( name )
      `)
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return res.status(200).json({
      success: true,
      data: {
        wallet,
        transactions: transactions?.map((tx: any) => ({
          ...tx,
          campaign_name: tx.campaigns ? tx.campaigns.name : null,
          campaigns: undefined
        })) || []
      }
    });

  } catch (error: any) {
    console.error('Wallet fetch error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateAutoTopup = async (req: AuthRequest, res: Response, _next: NextFunction) => {
  const workspaceId = req.user?.workspace_id;
  if (!workspaceId) {
    return res.status(400).json({ success: false, error: 'Missing workspace context' });
  }

  const { auto_topup_enabled, auto_topup_threshold, auto_topup_amount } = req.body;

  try {
    const { data: wallet, error } = await supabaseAdmin
      .from('wallets')
      .upsert(
        {
          workspace_id: workspaceId,
          auto_topup_enabled: Boolean(auto_topup_enabled),
          auto_topup_threshold: Number(auto_topup_threshold) || 50,
          auto_topup_amount: Number(auto_topup_amount) || 500,
        },
        { onConflict: 'workspace_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, data: wallet });
  } catch (error: any) {
    console.error('Auto-topup update error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
