import { useEffect } from 'react';
import { useChatRestrictions } from '@/hooks/useChatRestrictions';
import { useProfileRealtime } from '@/hooks/useProfileRealtime';

interface DebugPanelProps {
  userId: string;
}

export const DebugPanel = ({ userId }: DebugPanelProps) => {
  const { restriction, loading: restrictionLoading } = useChatRestrictions(userId);
  const { profile, loading: profileLoading } = useProfileRealtime(userId);

  useEffect(() => {
    console.log('🐛 Debug Panel - User ID:', userId);
    console.log('🐛 Debug Panel - Restriction:', restriction);
    console.log('🐛 Debug Panel - Profile:', profile);
  }, [userId, restriction, profile]);

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-4 rounded-lg text-xs z-[9999] max-w-sm">
      <h3 className="font-bold mb-2">🐛 Debug Panel</h3>
      <div className="space-y-1">
        <div>User ID: {userId}</div>
        <div>
          Chat Status: {restrictionLoading ? 'Loading...' : restriction.isBlocked ? '🚫 BLOCKED' : '✅ ALLOWED'}
        </div>
        {restriction.isBlocked && (
          <div className="text-red-300">
            Reason: {restriction.reason}
            <br />
            Until: {restriction.blockedUntil?.toLocaleString()}
          </div>
        )}
        <div>
          Profile: {profileLoading ? 'Loading...' : profile ? '✅ Loaded' : '❌ None'}
        </div>
        {profile && (
          <div className="text-green-300">
            Name: {profile.full_name}
            <br />
            Avatar: {profile.avatar_url ? '✅ Has' : '❌ None'}
          </div>
        )}
      </div>
    </div>
  );
};