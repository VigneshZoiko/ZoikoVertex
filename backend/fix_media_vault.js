require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Fixing media_library items that were approved...');
  
  // Find review items that are APPROVED and came from media_library
  const { data: reviewItems, error: reviewErr } = await supabase
    .from('review_items')
    .select('source_entity_id')
    .eq('source_module', 'media_library')
    .eq('status', 'APPROVED');
    
  if (reviewErr) {
    console.error('Error fetching review items:', reviewErr);
    return;
  }
  
  const idsToUpdate = reviewItems.map(item => item.source_entity_id).filter(Boolean);
  
  if (idsToUpdate.length > 0) {
    const { data: updateRes, error: updateErr } = await supabase
      .from('media_library')
      .update({ status: 'available' })
      .in('id', idsToUpdate)
      .eq('status', 'pending_review');
      
    if (updateErr) {
      console.error('Error updating media library:', updateErr);
    } else {
      console.log(`Successfully updated ${idsToUpdate.length} media items to 'available' status in the vault.`);
    }
  } else {
    console.log('No approved media items found to update.');
  }
}

run();
