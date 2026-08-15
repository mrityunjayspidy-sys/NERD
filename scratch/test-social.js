const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xokqlvvqmqybwbwopqmy.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhva3FsdnZxbXF5Yndid29wcW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODM4NjYsImV4cCI6MjEwMjM1OTg2Nn0.mh8raVxS_C6JbYmgxhOMHa6q4dO7DAyk8WlYwLcsOEk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithUUID() {
  const testUUID = 'a0000000-0000-4000-8000-000000000001';
  const testPayload = JSON.stringify({
    type: 'FRIEND_REQUEST',
    id: 'req-test-123',
    sender_id: testUUID,
    sender_name: 'Spidy',
    sender_code: 'NERD-8400',
    receiver_code: 'NERD-2801',
    status: 'pending',
    created_at: new Date().toISOString()
  });

  const { data: insertData, error: insertError } = await supabase
    .from('messages')
    .insert({
      channel_id: 'system:friend_requests',
      sender_id: testUUID,
      sender_name: 'Spidy',
      content: testPayload,
    })
    .select();

  console.log('Insert result:', { insertData, insertError });

  const { data: readData, error: readError } = await supabase
    .from('messages')
    .select('*')
    .eq('channel_id', 'system:friend_requests');

  console.log('Read result:', { count: readData ? readData.length : 0, readError });
  if (readData && readData.length > 0) {
    console.log('Parsed content:', JSON.parse(readData[0].content));
  }
}

testWithUUID();
