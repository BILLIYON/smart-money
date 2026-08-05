import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

try {
  const envText = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  envText.split('\n').forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val;
    }
  });
} catch (e) {}

import { ALL_BUDDIES } from '../src/lib/buddies';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  console.log(`Starting seeding of ${ALL_BUDDIES.length} buddies to Supabase...`);

  for (const buddy of ALL_BUDDIES) {
    const priceMonthly = buddy.price === "Free" ? 0 : parseInt(buddy.price.replace(/[^0-9]/g, ''), 10) * 1000;

    const row = {
      id: buddy.id,
      name: buddy.name,
      tag: buddy.tag,
      description: buddy.desc,
      philosophy: buddy.philosophy,
      price_monthly: isNaN(priceMonthly) ? 0 : priceMonthly,
      ai_model: buddy.model.toLowerCase().replace('-', ''),
      banner_color: buddy.bannerColor,
      avatar_bg: buddy.avatarBg,
      avatar_content: buddy.avatarContent,
      avatar_is_serif: buddy.avatarIsSerif,
      rating: parseFloat(buddy.rating) || 0,
      review_count: parseInt(buddy.reviewCount.replace(/[^0-9]/g, '')) * (buddy.reviewCount.includes('k') ? 1000 : 1),
      is_fan_sim: buddy.isFanSim,
      fan_disclaimer: buddy.disclaimer || null,
      status: 'live',
      category: buddy.categories,
    };

    console.log(`Upserting ${buddy.id}...`);
    const { error } = await supabase.from('buddies').upsert(row);
    if (error) {
      console.error(`Failed to upsert ${buddy.id}:`, error.message);
    } else {
      console.log(`Success: ${buddy.id}`);
    }
  }
  console.log("Seeding complete!");
}

run();
