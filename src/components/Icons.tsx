// ============================================================================
// NeuroSaathi icon set — one calm, rounded, stroke-based icon language.
// Every icon renders with currentColor so it inherits the surrounding text
// colour. Nav icons accept `active` to fill when the route is selected.
// ============================================================================

type IconProps = {
  active?: boolean;
  size?: number;
  className?: string;
};

const base = (size: number, active?: boolean) =>
  ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: active ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  } as const);

export function BackIcon({ size = 22, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M19 12H5M12 19l-7-7 7-7" strokeWidth={2.4} />
    </svg>
  );
}

export function HomeIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function GamesIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <rect x="3" y="7" width="18" height="11" rx="4" />
      <circle cx="8" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M14 11h2M15 10v2" />
    </svg>
  );
}

export function BellIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function HeartsIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <path d="M12 20.5l-8-8a5 5 0 0 1 7.1-7.1L12 6.4l.9-.9a5 5 0 0 1 7.1 7.1z" />
    </svg>
  );
}

export function ChartIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}

export function GridIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <rect x="3" y="3" width="7" height="7" rx="2.2" fill={active ? 'currentColor' : 'none'} />
      <rect x="14" y="3" width="7" height="7" rx="2.2" fill={active ? 'currentColor' : 'none'} />
      <rect x="3" y="14" width="7" height="7" rx="2.2" fill={active ? 'currentColor' : 'none'} />
      <rect x="14" y="14" width="7" height="7" rx="2.2" fill={active ? 'currentColor' : 'none'} />
    </svg>
  );
}

export function UserIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <circle cx="12" cy="8" r="4" fill={active ? 'currentColor' : 'none'} />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function LightbulbIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <path d="M9 18h6M10 22h4M12 2a6 6 0 0 1 3.6 10.8c-.9.7-1.6 1.6-1.6 3.2M9.6 16c0-1.6-.7-2.5-1.6-3.2A6 6 0 0 1 12 2z" />
    </svg>
  );
}

export function AlertIcon({ active, size = 26 }: IconProps) {
  return (
    <svg {...base(size, active)}>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17.5v.3" />
    </svg>
  );
}

export function ClockIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Reminder type icons
// ----------------------------------------------------------------------------

export function PillIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="3" width="14" height="18" rx="7" transform="rotate(-45 12 12)" />
      <path d="M9 9l6 6" />
    </svg>
  );
}

export function WaterIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
      <path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5" />
    </svg>
  );
}

export function MealIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12h16" />
      <path d="M6 12c0-4 2.5-7 6-7v7" />
      <path d="M18 12c0-4-2.5-7-6-7" />
      <path d="M6 16h12" />
    </svg>
  );
}

export function WalkIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="13" cy="4" r="2" />
      <path d="M13 6l-2 4 3 3 3 2" />
      <path d="M11 10l-3 4 2 4" />
      <path d="M6 8l-2 3" />
    </svg>
  );
}

export function AppointmentIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M12 14l1.5 1.5L16 13" />
    </svg>
  );
}

export function SleepIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
    </svg>
  );
}

export function SparkleIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Mood icons (rounded faces)
// ----------------------------------------------------------------------------

export function MoodHappyIcon({ size = 28 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1.2 1.6 2.5 2.4 4 2.4s2.8-.8 4-2.4" />
      <circle cx="9" cy="9.5" r="0.4" fill="currentColor" />
      <circle cx="15" cy="9.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function MoodGoodIcon({ size = 28 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 13.5h7" />
      <circle cx="9" cy="9.5" r="0.4" fill="currentColor" />
      <circle cx="15" cy="9.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function MoodOkayIcon({ size = 28 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 13.5h7" />
      <circle cx="9" cy="9.5" r="0.4" fill="currentColor" />
      <circle cx="15" cy="9.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function MoodSadIcon({ size = 28 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 15c1.2-1.6 2.5-2.4 4-2.4s2.8.8 4 2.4" />
      <circle cx="9" cy="9.5" r="0.4" fill="currentColor" />
      <circle cx="15" cy="9.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

export function MoodWorriedIcon({ size = 28 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l1 1M14 9l1 1M8 15h8" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Action / utility icons
// ----------------------------------------------------------------------------

export function MicIcon({ size = 26 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
    </svg>
  );
}

export function PlayIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StopIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SpeakerIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </svg>
  );
}

export function CheckIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 12.5l5 5L20 6.5" strokeWidth={2.4} />
    </svg>
  );
}

export function CheckCircleIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </svg>
  );
}

export function PlusIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M5 12h14" strokeWidth={2.2} />
    </svg>
  );
}

export function ChevronRightIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 5l7 7-7 7" strokeWidth={2.2} />
    </svg>
  );
}

export function ChevronDownIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 9l7 7 7-7" strokeWidth={2.2} />
    </svg>
  );
}

export function XIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6L6 18" strokeWidth={2.2} />
    </svg>
  );
}

export function TrashIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" />
    </svg>
  );
}

export function RefreshIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Brand / feature icons
// ----------------------------------------------------------------------------

export function LeafIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" />
      <path d="M5 19c3-5 7-9 11-11" />
    </svg>
  );
}

export function ShieldIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function LockIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="5" y="10" width="14" height="10" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function InfoIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.2" />
    </svg>
  );
}

export function HeartIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 20.5l-8-8a5 5 0 0 1 7.1-7.1L12 6.4l.9-.9a5 5 0 0 1 7.1 7.1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BrainIcon({ size = 24 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9.5 3A3 3 0 0 0 6.6 5.8 3.5 3.5 0 0 0 4 9c0 .9.3 1.7.9 2.3A3 3 0 0 0 6.5 15a3.5 3.5 0 0 0 6 1 3.5 3.5 0 0 0 6-1 3 3 0 0 0 1.6-3.7c.6-.6.9-1.4.9-2.3a3.5 3.5 0 0 0-2.6-3.2A3 3 0 0 0 14.5 3c-.8 0-1.5.3-2 .8a3 3 0 0 0-3-.8z" />
      <path d="M12 8.5v4M10.5 10.5h3" />
    </svg>
  );
}

export function TargetIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function TimerIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
      <path d="M12 13V8M10 3h4" />
    </svg>
  );
}

export function CameraIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function UsersIcon({ size = 22 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M16.5 14.8c2.3.4 4.5 1.9 4.5 5.2" />
    </svg>
  );
}

export function CalendarIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function EyeIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}
