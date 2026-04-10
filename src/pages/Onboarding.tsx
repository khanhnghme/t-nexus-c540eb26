import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import FirstTimeOnboarding from '@/components/FirstTimeOnboarding';


export default function Onboarding() {
  const { user, profile, isLoading, mustChangePassword, refreshProfile } = useAuth();

  if (isLoading) return null;
  if (!user || !profile) return <Navigate to="/auth" replace />;
  if (profile.onboarding_completed) return <Navigate to="/dashboard" replace />;

  return (
    <FirstTimeOnboarding
      userId={user.id}
      userFullName={profile.full_name}
      userEmail={profile.email}
      userStudentId={profile.student_id}
      userInstitution={profile.institution}
      userPlan={profile.user_plan}
      mustChangePassword={mustChangePassword}
      onComplete={() => {
        refreshProfile();
      }}
    />
  );
}
