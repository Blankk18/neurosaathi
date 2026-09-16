import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Button, Modal, ProgressRing, Chip } from '@/components/ui';
import { PageHeader, SpeakText } from '@/components/common';
import { uid } from '@/data/demoData';
import type { ReminderType, ReminderStatus } from '@/types';
import {
  PillIcon,
  WaterIcon,
  MealIcon,
  WalkIcon,
  AppointmentIcon,
  SleepIcon,
  SparkleIcon,
  ClockIcon,
  CheckIcon,
  BellIcon,
  PlusIcon,
} from '@/components/Icons';

const TYPE_EMOJI: Record<ReminderType, string> = {
  medicine: '💊',
  water: '💧',
  meal: '🍚',
  walk: '🚶',
  appointment: '📅',
  sleep: '😴',
  custom: '🔔',
};

// Tinted icon chips per reminder type — replaces the bare emoji tile.
const TYPE_META: Record<ReminderType, { Icon: typeof PillIcon; tint: string }> = {
  medicine: { Icon: PillIcon, tint: 'bg-brand-100 text-brand-700' },
  water: { Icon: WaterIcon, tint: 'bg-info-100 text-info-700' },
  meal: { Icon: MealIcon, tint: 'bg-warm-100 text-warm-700' },
  walk: { Icon: WalkIcon, tint: 'bg-brand-50 text-brand-700 border border-brand-100' },
  appointment: { Icon: AppointmentIcon, tint: 'bg-info-50 text-info-600 border border-info-100' },
  sleep: { Icon: SleepIcon, tint: 'bg-brand-100 text-brand-800' },
  custom: { Icon: SparkleIcon, tint: 'bg-accent-50 text-accent-600' },
};

// Soft status tint for the card's top strip — colour alone, no heavy borders.
const STRIP_TINT: Record<ReminderStatus, string> = {
  done: 'bg-brand-200/70',
  pending: 'bg-warm-200/70',
  snoozed: 'bg-info-200/70',
  missed: 'bg-accent-200/70',
};

export default function Reminders() {
  const { t, state, dispatch, speakText, isOffline } = useApp();
  const reminders = state.reminders;
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addTime, setAddTime] = useState('12:00');
  const [addType, setAddType] = useState<ReminderType>('custom');
  const [toast, setToast] = useState<string | null>(null);
  const announced = useRef<Set<string>>(new Set());

  const adherence = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const done = reminders.filter((r) => r.history.some((h) => h.date === today && h.status === 'done')).length;
    const total = reminders.length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [reminders]);

  const sorted = useMemo(() => [...reminders].sort((a, b) => a.time.localeCompare(b.time)), [reminders]);

  // voice notification when a reminder's time arrives
  useEffect(() => {
    const iv = setInterval(() => {
      reminders.forEach((r) => {
        if (r.status !== 'pending') return;
        const [h, m] = r.time.split(':').map(Number);
        const curH = new Date().getHours();
        const curM = new Date().getMinutes();
        if (h === curH && Math.abs(m - curM) <= 1 && !announced.current.has(r.id)) {
          announced.current.add(r.id);
          speakText(t('reminders.voice.due', { name: r.name }));
          setToast(`🔔 ${r.name} ${r.time}`);
          window.setTimeout(() => setToast(null), 4000);
        }
      });
    }, 15000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  const setStatus = (id: string, status: ReminderStatus) => {
    const reminder = reminders.find((r) => r.id === id);
    dispatch({ type: 'UPDATE_REMINDER', id, status });
    const name = reminder?.name ?? '';
    if (status === 'done') {
      setToast(`✓ ${t('reminders.taken')}`);
      speakText(t('reminders.voice.done', { name }));
    } else if (status === 'snoozed') {
      setToast(`⏰ ${t('reminders.snoozed.toast')}`);
      speakText(t('reminders.voice.snoozed', { name }));
    } else {
      setToast(`⏳ ${t('reminders.later')}`);
    }
    window.setTimeout(() => setToast(null), 3000);
  };

  const addReminder = () => {
    if (!addName.trim() || !addTime) {
      setToast(t('err.missing'));
      return;
    }
    const newReminder = {
      id: uid('rem'),
      patientId: state.patient?.id ?? 'patient-asha',
      name: addName.trim(),
      type: addType,
      time: addTime,
      repeat: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      status: 'pending' as ReminderStatus,
      history: [],
    };
    dispatch({ type: 'ADD_REMINDER', reminder: newReminder });
    dispatch({ type: 'ENQUEUE_SYNC', kind: 'reminder', label: newReminder.name, detail: `${addTime} · created` });
    setShowAdd(false);
    setAddName('');
    setToast(`✓ ${newReminder.name} ${t('reminders.added')}`);
    speakText(t('reminders.voice.added', { name: newReminder.name, time: addTime }));
    window.setTimeout(() => setToast(null), 3000);
  };

  const list = sorted;
  const doneCount = reminders.filter((r) => r.status === 'done').length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t('reminders.title')}
        right={
          <button
            onClick={() => setShowAdd(true)}
            className="btn flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift hover:bg-brand-700 focus-visible:ring-4 focus-visible:ring-brand-300"
            aria-label={t('reminders.add')}
          >
            <PlusIcon size={22} />
          </button>
        }
      />

      {/* Adherence overview — progress ring card with a soft top progress line */}
      <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-card fade-up">
        <div className="h-1.5 w-full bg-brand-100" aria-hidden>
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500"
            style={{ width: `${adherence}%` }}
          />
        </div>
        <div className="flex items-center gap-5 p-5 sm:p-6">
          <div className="shrink-0 rounded-3xl bg-brand-50 p-2.5">
            <ProgressRing value={adherence} size={84} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-extrabold text-brand-900">{t('reminders.adherence')}</div>
            <div className="mt-0.5 text-base font-semibold text-neutral-500">
              {doneCount}/{reminders.length} {t('reminders.today')}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isOffline && (
                <Chip tone="warm">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> {t('common.offline')}
                </Chip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reminder list */}
      <div className="mt-6 space-y-3.5">
        {list.map((r) => {
          const meta = TYPE_META[r.type];
          const Icon = meta.Icon;
          return (
            <Card key={r.id} className="fade-up overflow-hidden p-0">
              <div className={`h-1 w-full ${STRIP_TINT[r.status]}`} aria-hidden />
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${meta.tint}`}
                    aria-hidden
                  >
                    <Icon size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate pr-2 text-lg font-extrabold leading-tight text-brand-900">
                          {r.name}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-base font-bold text-brand-700">
                          <ClockIcon size={15} />
                          {r.time}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {r.status === 'done' && (
                          <Chip tone="brand">
                            <CheckIcon size={14} /> {t('reminders.status.taken')}
                          </Chip>
                        )}
                        {r.status === 'pending' && (
                          <Chip tone="warm">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{' '}
                            {t('reminders.status.pending')}
                          </Chip>
                        )}
                        {r.status === 'snoozed' && (
                          <Chip tone="info">
                            <ClockIcon size={14} /> {t('reminders.snooze')}
                          </Chip>
                        )}
                        {r.status === 'missed' && (
                          <Chip tone="accent">{t('reminders.status.missed')}</Chip>
                        )}
                      </div>
                    </div>

                    <div className="mt-2">
                      <SpeakText text={`${r.name} at ${r.time}`} />
                    </div>
                  </div>
                </div>

                {(r.status === 'pending' || r.status === 'snoozed' || r.status === 'missed') && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button variant="primary" size="md" onClick={() => setStatus(r.id, 'done')} className="!py-3 text-base">
                      <CheckIcon size={16} /> {t('reminders.taken')}
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => setStatus(r.id, 'snoozed')} className="!py-3 text-base">
                      <ClockIcon size={16} /> {t('reminders.snooze')}
                    </Button>
                    <Button variant="ghost" size="md" onClick={() => setStatus(r.id, 'missed')} className="!py-3 text-base">
                      <BellIcon size={16} /> {t('reminders.later')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {list.length === 0 && (
          <Card className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">
              <BellIcon size={26} />
            </div>
            <p className="mt-3 text-lg font-bold text-neutral-500">{t('reminders.noReminders')}</p>
          </Card>
        )}
      </div>

      {toast && (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-brand-900 px-5 py-3 text-base font-bold text-white shadow-lift pop"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t('reminders.custom')}>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="rem-name">{t('family.name')}</label>
            <input
              id="rem-name"
              className="input"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder={t('reminders.placeholder')}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label" htmlFor="rem-time">
                <span className="inline-flex items-center gap-1">
                  <ClockIcon size={14} /> {t('reminders.time.label')}
                </span>
              </label>
              <input id="rem-time" className="input" type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="rem-type">{t('reminders.type.label')}</label>
              <select
                id="rem-type"
                className="input"
                value={addType}
                onChange={(e) => setAddType(e.target.value as ReminderType)}
              >
                {(Object.keys(TYPE_EMOJI) as ReminderType[]).map((k) => (
                  <option key={k} value={k}>
                    {t(`reminders.${k}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="huge" onClick={addReminder} className="!py-4">
            <CheckIcon size={20} /> {t('common.save')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
