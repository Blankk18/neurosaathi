import { Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PatientShell, CaregiverShell } from '@/components/layouts';

import Landing from '@/pages/Landing';
import RoleSelect from '@/pages/RoleSelect';
import Onboarding from '@/pages/Onboarding';
import Baseline from '@/pages/Baseline';
import PatientHome from '@/pages/patient/PatientHome';
import GamesHub from '@/pages/patient/GamesHub';
import MemoryMatch from '@/pages/patient/games/MemoryMatch';
import SceneMemory from '@/pages/patient/games/SceneMemory';
import PatternGame from '@/pages/patient/games/PatternGame';
import RoutineRecall from '@/pages/patient/games/RoutineRecall';
import FamilyMemoryGame from '@/pages/patient/games/FamilyMemoryGame';
import RegionGame from '@/pages/patient/games/RegionGame';
import Reminders from '@/pages/patient/Reminders';
import Memories from '@/pages/patient/Memories';
import Progress from '@/pages/patient/Progress';
import MoodCheck from '@/pages/patient/MoodCheck';
import VoiceChat from '@/pages/patient/VoiceChat';
import CaregiverOverview from '@/pages/caregiver/CaregiverOverview';
import Patients from '@/pages/caregiver/Patients';
import Insights from '@/pages/caregiver/Insights';
import Alerts from '@/pages/caregiver/Alerts';
import Activity from '@/pages/caregiver/Activity';
import Settings from '@/pages/caregiver/Settings';
import Privacy from '@/pages/system/Privacy';
import Architecture from '@/pages/system/Architecture';
import DemoMode from '@/pages/system/DemoMode';

function PatientGate({ children }: { children: JSX.Element }) {
  const { state } = useApp();
  if (state.currentRole !== 'elder') return <Navigate to="/login" replace />;
  if (!state.patient) return <Navigate to="/login" replace />;
  return children;
}

function isElder(state: ReturnType<typeof useApp>['state']): boolean {
  return state.currentRole === 'elder';
}

export default function App() {
  const { state } = useApp();
  const role = state.currentRole;

  return (
    <Routes>
      {/* public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<RoleSelect />} />
      <Route path="/onboarding" element={role === 'elder' ? <Onboarding /> : <RoleSelect />} />
      <Route path="/baseline" element={role === 'elder' ? <Baseline /> : <RoleSelect />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/architecture" element={<Architecture />} />
      <Route path="/demo" element={<DemoMode />} />

      {/* elder */}
      <Route
        path="/home"
        element={
          <PatientGate>
            <PatientShell>
              <PatientHome />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games"
        element={
          <PatientGate>
            <PatientShell>
              <GamesHub />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games/memory"
        element={
          <PatientGate>
            <PatientShell>
              <MemoryMatch />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games/scene"
        element={
          <PatientGate>
            <PatientShell>
              <SceneMemory />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games/pattern"
        element={
          <PatientGate>
            <PatientShell>
              <PatternGame />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games/routine"
        element={
          <PatientGate>
            <PatientShell>
              <RoutineRecall />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games/family"
        element={
          <PatientGate>
            <PatientShell>
              <FamilyMemoryGame />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/games/region"
        element={
          <PatientGate>
            <PatientShell>
              <RegionGame />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/reminders"
        element={
          <PatientGate>
            <PatientShell>
              <Reminders />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/memories"
        element={
          <PatientGate>
            <PatientShell>
              <Memories />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/progress"
        element={
          <PatientGate>
            <PatientShell>
              <Progress />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/voice"
        element={
          <PatientGate>
            <PatientShell>
              <VoiceChat />
            </PatientShell>
          </PatientGate>
        }
      />
      <Route
        path="/mood"
        element={
          <PatientGate>
            <PatientShell>
              <MoodCheck />
            </PatientShell>
          </PatientGate>
        }
      />

      {/* caregiver */}
      <Route
        path="/caregiver"
        element={
          isElder(state) ? (
            <Navigate to="/login" replace />
          ) : (
            <CaregiverShell>
              <CaregiverOverview />
            </CaregiverShell>
          )
        }
      />
      <Route
        path="/caregiver/patients"
        element={
          isElder(state) ? (
            <Navigate to="/login" replace />
          ) : (
            <CaregiverShell>
              <Patients />
            </CaregiverShell>
          )
        }
      />
      <Route
        path="/caregiver/insights"
        element={
          isElder(state) ? (
            <Navigate to="/login" replace />
          ) : (
            <CaregiverShell>
              <Insights />
            </CaregiverShell>
          )
        }
      />
      <Route
        path="/caregiver/alerts"
        element={
          isElder(state) ? (
            <Navigate to="/login" replace />
          ) : (
            <CaregiverShell>
              <Alerts />
            </CaregiverShell>
          )
        }
      />
      <Route
        path="/caregiver/activity"
        element={
          isElder(state) ? (
            <Navigate to="/login" replace />
          ) : (
            <CaregiverShell>
              <Activity />
            </CaregiverShell>
          )
        }
      />
      <Route
        path="/caregiver/settings"
        element={
          isElder(state) ? (
            <Navigate to="/login" replace />
          ) : (
            <CaregiverShell>
              <Settings />
            </CaregiverShell>
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}