import Link from 'next/link';
import { TrendingUp, UserPlus, Trophy, ArrowUpRight, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export async function ActivityFeed() {
  const db = await supabase();
  if (!db) return null;

  let activities: any[] = [];

  try {
    // Get recent activities
    const result = await db
      .from('activity_feed')
      .select('*, businesses(name, slug)')
      .order('created_at', { ascending: false })
      .limit(20);
    activities = result.data || [];
  } catch (error) {
    console.error('Activity feed query failed:', error);
    return null;
  }

  if (!activities || activities.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
        <Clock size={24} style={{ margin: '0 auto 12px' }} />
        <p>No recent activity yet. Be the first to make waves!</p>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_registration': return <UserPlus size={16} />;
      case 'top_10_entry': return <TrendingUp size={16} />;
      case 'number_one': return <Trophy size={16} />;
      case 'rank_improvement': return <ArrowUpRight size={16} />;
      default: return <TrendingUp size={16} />;
    }
  };

  const getMessage = (activity: any) => {
    const bizName = activity.businesses?.name || 'A business';
    const details = activity.details || {};

    switch (activity.type) {
      case 'new_registration':
        return `${bizName} just joined OUTBIDLY`;
      case 'top_10_entry':
        return `${bizName} entered the Top 10${details.category ? ` in ${details.category}` : ''}`;
      case 'number_one':
        return `${bizName} is now #1${details.category ? ` in ${details.category}` : ''}!`;
      case 'rank_improvement':
        return `${bizName} moved from #${details.from_rank} to #${details.to_rank}`;
      case 'profile_claimed':
        return `${bizName} claimed their profile`;
      default:
        return `${bizName} made a move`;
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <TrendingUp size={16} /> Live Activity
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {activities.map((activity: any) => (
          <div
            key={activity.id}
            style={{
              display: 'flex',
              gap: 12,
              padding: 12,
              background: '#f9fafb',
              borderRadius: 8,
              alignItems: 'flex-start',
            }}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#e9bd6b',
              color: '#1a2a3a',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}>
              {getIcon(activity.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {activity.businesses ? (
                <Link href={`/business/${activity.businesses.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <p style={{ fontSize: 13, margin: 0, lineHeight: 1.4 }}>
                    {getMessage(activity)}
                  </p>
                </Link>
              ) : (
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.4 }}>{getMessage(activity)}</p>
              )}
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{getTimeAgo(activity.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
