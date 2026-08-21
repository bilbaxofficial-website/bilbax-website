import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // 1. Get logged-in user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized user session' }, { status: 401 });
    }

    // 2. Fetch Instagram account details from database
    // (Note: Agar tumhari table ka naam kuch aur hai jaise 'connected_accounts', toh yahan change kar lena)
    const { data: account, error: accountError } = await supabase
      .from('instagram_accounts') 
      .select('instagram_user_id, access_token')
      .eq('user_id', user.id)
      .single();

    if (accountError || !account || !account.access_token) {
      return NextResponse.json({ error: 'Instagram token not found in database' }, { status: 400 });
    }

    // 3. Fetch Posts/Reels from Meta Graph API
    const igRes = await fetch(
      `https://graph.facebook.com/v18.0/${account.instagram_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token=${account.access_token}`
    );

    const igData = await igRes.json();

    if (igData.error) {
      return NextResponse.json({ error: igData.error.message }, { status: 400 });
    }

    return NextResponse.json({ posts: igData.data || [] });
  } catch (err) {
    console.error('Media fetch error:', err);
    return NextResponse.json({ error: 'Internal server error while fetching media' }, { status: 500 });
  }
}
