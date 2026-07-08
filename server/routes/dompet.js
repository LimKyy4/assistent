import { supabase } from '../db.js';

export async function getDompet(req, res) {
    const { data, error } = await supabase.from('dompet').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}

export async function updateDompet(req, res) {
    const { saldo, target_wishlist, nominal_wishlist } = req.body;
    const updateData = {};
    if (saldo !== undefined) updateData.saldo = parseInt(saldo);
    if (target_wishlist !== undefined) updateData.target_wishlist = target_wishlist;
    if (nominal_wishlist !== undefined) updateData.nominal_wishlist = parseInt(nominal_wishlist);

    const { data, error } = await supabase.from('dompet').update(updateData).eq('id', 1).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
}
