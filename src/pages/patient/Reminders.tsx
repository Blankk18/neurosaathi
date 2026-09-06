import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { Card, Button, Modal, ProgressRing } from '@/components/ui';
import { PageHeader, SpeakText } from '@/components/common';
import { uid } from '@/data/demoData';
import type { ReminderType, ReminderStatus } from '@/types';

const TYPE_EMOJI: Record<ReminderType, string> = {
  medicine: '💊',
  water: '💧',
  meal: '🍚',
  walk: '🚶',
  appointment: '📅',
  sleep: '😴',
  custom: '🔔',
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

  return (
    <div>
      <PageHeader title={t('reminders.title')} right={
        <button onClick={() => setShowAdd(true)} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lift" aria-label={t('reminders.add')}>
          +
        </button>
      } />

      <div className="mt-4 flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card">
        <ProgressRing value={adherence} size={72} />
        <div className="flex-1">
          <div className="text-lg font-extrabold text-brand-900">{t('reminders.adherence')}</div>
          <div className="text-sm font-semibold text-neutral-500">
            {reminders.filter((r) => r.status === 'done').length}/{reminders.length} {t('reminders.today')}
          </div>
        </div>
        {isOffline && <span className="chip bg-warm-100 text-warm-500">🟠 {t('common.offline')}</span>}
      </div>

      <div className="mt-5 space-y-3">
        {list.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden>{TYPE_EMOJI[r.type]}</span>
              <div className="flex-1">
                <div className="text-xl font-extrabold text-brand-900">{r.name}</div>
                <div className="text-lg font-bold text-brand-600">🕐 {r.time}</div>
              </div>
              {r.status === 'done' && <span className="chip bg-brand-600 text-white">✓ {t('reminders.status.taken')}</span>}
              {r.status === 'pending' && <span className="chip bg-warm-100 text-warm-500">• {t('reminders.status.pending')}</span>}
              {r.status === 'missed' && <span className="chip bg-accent-50 text-accent-400">{t('reminders.status.missed')}</span>}
            </div>
            {(r.status === 'pending' || r.status === 'snoozed' || r.status === 'missed') && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button variant="primary" size="md" onClick={() => setStatus(r.id, 'done')} className="!py-3 text-base">
                  ✓ {t('reminders.taken')}
                </Button>
                <Button variant="secondary" size="md" onClick={() => setStatus(r.id, 'snoozed')} className="!py-3 text-base">
                  ⏰ {t('reminders.snooze')}
                </Button>
                <Button variant="ghost" size="md" onClick={() => setStatus(r.id, 'missed')} className="!py-3 text-base">
                  ⏳ {t('reminders.later')}
                </Button>
              </div>
            )}
            <SpeakText text={`${r.name} at ${r.time}`} />
          </Card>
        ))}
        {list.length === 0 && <Card className="text-center text-neutral-500">{t('reminders.noReminders')}</Card>}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-brand-900 px-5 py-3 text-base font-bold text-white shadow-lift pop">
          {toast}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`➕ ${t('reminders.custom')}`}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('family.name')}</label>
            <input className="input" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={t('reminders.placeholder')} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">🕐 {t('reminders.time.label')}</label>
              <input className="input" type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="label">{t('reminders.type.label')}</label>
              <select className="input" value={addType} onChange={(e) => setAddType(e.target.value as ReminderType)}>
                {(Object.keys(TYPE_EMOJI) as ReminderType[]).map((k) => (
                  <option key={k} value={k}>{t(`reminders.${k}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <Button variant="huge" onClick={addReminder} className="!py-4">
            ✅ {t('common.save')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}