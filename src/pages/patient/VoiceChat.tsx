import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader, VoiceButton } from '@/components/common';
import { speechRecognitionSupported } from '@/services/voice';
import type { GameKind } from '@/types';

interface Msg {
  from: 'user' | 'assistant';
  text: string;
  time: string;
}

const GAME_ROUTE: Record<GameKind, string> = {
  'memory-match': '/games/memory',
  'scene-memory': '/games/scene',
  pattern: '/games/pattern',
  routine: '/games/routine',
  'family-memory': '/games/family',
  region: '/games/region',
};

export default function VoiceChat() {
  const { t, state, speakText } = useApp();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [heard, setHeard] = useState('');
  const lastReply = useRef('');

  const nextReminder = useMemo(() => {
    const now = new Date();
    const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return state.reminders
      .filter((r) => r.status !== 'done' && r.time >= cur)
      .sort((a, b) => a.time.localeCompare(b.time))[0];
  }, [state.reminders]);

  const push = (from: Msg['from'], text: string, speak = false) => {
    setMsgs((m) => [...m, { from, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    if (from === 'assistant' && speak) {
      lastReply.current = text;
      speakText(text);
    }
  };

  // does the spoken text contain any of the phrases (translated or English fallback)?
  const hears = (text: string, phrases: string[]): boolean => phrases.some((p) => text.includes(p.toLowerCase()));

  const process = (raw: string) => {
    const text = raw.trim().toLowerCase();
    setHeard(raw);
    push('user', raw);
    if (hears(text, [t('voice.cmd.memory'), 'memory', 'match', 'play a game', 'start a game'])) {
      push('assistant', t('voice.reply.memory.start'), true);
      window.setTimeout(() => navigate(GAME_ROUTE['memory-match']), 1200);
    } else if (hears(text, [t('voice.cmd.routine'), 'routine', 'daily'])) {
      push('assistant', t('voice.reply.routine.start'), true);
      window.setTimeout(() => navigate(GAME_ROUTE.routine), 1200);
    } else if (hears(text, [t('voice.cmd.reminders'), 'remin'])) {
      push(
        'assistant',
        nextReminder ? t('voice.reply.reminders.next', { name: nextReminder.name, time: nextReminder.time }) : t('voice.reply.reminders.none'),
        true,
      );
    } else if (hears(text, [t('voice.cmd.next'), 'upcoming', 'next activity', 'next reminder'])) {
      push(
        'assistant',
        nextReminder ? t('voice.reply.reminders.next', { name: nextReminder.name, time: nextReminder.time }) : t('voice.reply.reminders.none'),
        true,
      );
    } else if (hears(text, [t('voice.cmd.back'), 'go back'])) {
      push('assistant', t('voice.reply.goback'), true);
      window.setTimeout(() => navigate(-1), 900);
    } else if (hears(text, [t('voice.cmd.home'), 'go home'])) {
      push('assistant', t('voice.reply.gohome'), true);
      window.setTimeout(() => navigate('/home'), 900);
    } else if (hears(text, [t('voice.cmd.repeat'), 'repeat'])) {
      push('assistant', lastReply.current || t('voice.reply.repeat.empty'), true);
    } else if (hears(text, ['call caregiver', 'caregiver'])) {
      push(
        'assistant',
        t('voice.reply.caregiver', {
          name: state.patient?.caregiverName ?? t('common.familyMember'),
          relationship: state.patient?.caregiverRelationship ?? t('common.familyMember'),
        }),
        true,
      );
    } else if (hears(text, [t('voice.cmd.help'), 'help'])) {
      push('assistant', t('voice.reply.help'), true);
    } else if (hears(text, ['hello', 'hi ', 'namaskar', 'good morning', 'good evening'])) {
      push('assistant', t('voice.greet'), true);
    } else {
      push('assistant', t('voice.reply.fallback', { heard: raw }), true);
    }
  };

  const support = speechRecognitionSupported();

  return (
    <div className="flex min-h-[70vh] flex-col">
      <PageHeader title={t('voice.title')} />
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-brand-700">
        <span aria-hidden>🤖</span> NeuroSaathi
      </div>

      {!support && (
        <div className="mt-4 rounded-2xl border-2 border-accent-200 bg-accent-50 p-4 text-base font-bold text-accent-500">
          {t('voice.fallback')}
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto rounded-3xl bg-white/70 p-4 shadow-card" style={{ maxHeight: '52vh' }}>
        {msgs.length === 0 && (
          <p className="text-center text-base font-semibold text-neutral-500">
            {t('voice.greet')}
            <br />
            {t('voice.try')}: “{t('voice.suggest.startGame')}”, “{t('voice.suggest.routine')}”, “{t('voice.suggest.reminders')}”, “{t('voice.suggest.next')}” or “{t('voice.suggest.gohome')}”.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`pop max-w-[85%] rounded-3xl px-4 py-3 text-lg font-semibold ${
                m.from === 'user' ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-900'
              }`}
            >
              {m.from === 'assistant' && <span className="mr-1" aria-hidden>🤖</span>}
              {m.text}
              <span className={`ml-2 block text-xs ${m.from === 'user' ? 'text-brand-200' : 'text-brand-500'}`}>{m.time}</span>
            </div>
          </div>
        ))}
        <div className="h-1" />
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <VoiceButton onTranscript={process} label={t('voice.tap')} size="xl" />
        {heard && <p className="text-sm font-semibold text-neutral-500">🎙 {t('voice.heard')}: “{heard}”</p>}
        {/* button-only fallback commands */}
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <button onClick={() => process(t('voice.cmd.memory'))} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-card">🧠 {t('voice.suggest.startGame')}</button>
          <button onClick={() => process(t('voice.cmd.routine'))} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-card">🕰️ {t('voice.suggest.routine')}</button>
          <button onClick={() => process(t('voice.cmd.reminders'))} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-card">🔔 {t('voice.suggest.reminders')}</button>
          <button onClick={() => process(t('voice.cmd.next'))} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-card">📅 {t('voice.suggest.next')}</button>
          <button onClick={() => process(t('voice.cmd.home'))} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-card">🏠 {t('voice.suggest.gohome')}</button>
        </div>
      </div>
    </div>
  );
}