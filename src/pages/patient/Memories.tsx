import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Modal, SectionTitle, Chip } from '@/components/ui';
import { loadImage } from '@/services/storage';
import type { FamilyMemory } from '@/types';
import {
  CameraIcon,
  UsersIcon,
  ShieldIcon,
  HeartIcon,
  HomeIcon,
  CalendarIcon,
  LightbulbIcon,
  ChevronRightIcon,
} from '@/components/Icons';

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

import { memoryService } from '@/services/memoryService';

// READ-ONLY for the elder.
// Family memories are created, edited and removed by the caregiver (see the
// caregiver Family Memories manager). The elder can view their album here.
export default function Memories() {
  const { t, state, isOffline } = useApp();
  const navigate = useNavigate();
  const elderId = state.patient?.id || 'e0000000-0000-0000-0000-000000000001';
  const [memories, setMemories] = useState<FamilyMemory[]>(state.familyMemories);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [large, setLarge] = useState<FamilyMemory | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const remote = await memoryService.getMemories(elderId);
      const list = remote.length > 0 ? remote : state.familyMemories;
      setMemories(list);

      const map: Record<string, string | null> = {};
      for (const f of list) {
        if (f.photo) {
          map[f.id] = f.photo;
        } else {
          const blob = await loadImage(`fam-${f.id}`);
          if (blob) map[f.id] = URL.createObjectURL(blob);
        }
      }
      setPhotos(map);
    } catch {
      setMemories(state.familyMemories);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    const unsubscribe = memoryService.subscribeToMemories(elderId, () => {
      void loadAll();
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elderId, state.familyMemories.length]);

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-canvas px-4 pb-28 pt-4">
      <PageHeader title={t('family.title')} />

      <p className="mt-1 max-w-2xl text-base font-semibold leading-relaxed text-brand-700/80">
        Your cherished people, always close — shared with you by your family.
      </p>

      {isOffline && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-warm-100 px-4 py-2 text-sm font-bold text-warm-600">
          <span className="h-2 w-2 rounded-full bg-warm-400" aria-hidden />
          🟠 {t('offline.banner')}
        </div>
      )}

      {loading && (
        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-brand-500 animate-ping" />
          Syncing memories with family…
        </div>
      )}

      {/* Album header — count + soft description */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <HeartIcon size={22} />
          </span>
          <div>
            <div className="text-xs font-extrabold uppercase tracking-widest text-brand-600">Memory album</div>
            <div className="text-lg font-extrabold text-brand-900">
              {memories.length} {memories.length === 1 ? 'person' : 'people'} remembered
            </div>
          </div>
        </div>
        <div className="mt-4 h-px w-full bg-brand-50" />
        <p className="mt-3 text-sm font-semibold leading-relaxed text-neutral-600">
          🌿 A caregiver adds and cares for these memories. Tap any card to see it larger.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {memories.map((f, idx) => {
          const photo = photos[f.id];
          return (
            <button
              key={f.id}
              onClick={() => setLarge(f)}
              className="card group flex flex-col overflow-hidden p-0 text-left transition hover:shadow-lift fade-up"
              aria-label={`${f.name}, ${f.relationship}`}
            >
              {/* Photo — cinematic top, rounded, with soft overlay */}
              <div
                className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-brand-50 via-warm-50 to-brand-50"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {photo ? (
                  <>
                    <img
                      src={photo}
                      alt={f.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-extrabold tracking-wide text-brand-800 shadow-sm">
                        <UsersIcon size={14} /> {f.relationship}
                      </div>
                      <div className="mt-2 text-2xl font-extrabold leading-none text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
                        {f.name}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-extrabold text-brand-700 shadow-card ring-8 ring-brand-50">
                      {initials(f.name)}
                    </span>
                    <div>
                      <div className="text-xl font-extrabold text-brand-900">{f.name}</div>
                      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-bold text-brand-700 shadow-sm">
                        <UsersIcon size={14} /> {f.relationship}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-3 py-1 text-xs font-bold text-brand-700">
                      <CameraIcon size={14} /> No photo yet
                    </span>
                  </div>
                )}
              </div>

              {/* Details — tinted, spacious, elderly-readable */}
              <div className="flex flex-1 flex-col gap-3 p-5">
                {photo && (
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-extrabold text-brand-900">{f.name}</h3>
                    <span className="hidden sm:inline-flex">
                      <Chip tone="warm">{f.relationship}</Chip>
                    </span>
                  </div>
                )}

                <div className="space-y-2.5">
                  {f.info && (
                    <div className="flex gap-2.5 rounded-2xl bg-brand-50/70 px-3.5 py-3">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                        <LightbulbIcon size={16} />
                      </span>
                      <p className="text-base font-semibold leading-snug text-brand-900">💡 {f.info}</p>
                    </div>
                  )}
                  {f.birthday && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-warm-50 px-3.5 py-2 text-sm font-bold text-warm-700">
                      <CalendarIcon size={16} /> 🎂 {f.birthday}
                    </div>
                  )}
                  {f.notes && (
                    <div className="rounded-2xl bg-neutral-50 px-3.5 py-3">
                      <p className="text-sm font-semibold leading-relaxed text-neutral-700">📝 {f.notes}</p>
                    </div>
                  )}
                  {!f.info && !f.birthday && !f.notes && (
                    <p className="text-sm font-semibold text-neutral-400">A memory your family is still writing.</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {memories.length === 0 && (
        <Card className="mt-5 flex flex-col items-center gap-3 py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <UsersIcon size={28} />
          </span>
          <div className="text-xl font-extrabold text-brand-900">Your album awaits</div>
          <p className="max-w-md text-base font-semibold leading-relaxed text-neutral-500">{t('family.empty')}</p>
        </Card>
      )}

      <div className="mt-6 flex gap-3 rounded-3xl bg-brand-50 p-4">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-sm">
          <ShieldIcon size={18} />
        </span>
        <p className="text-sm font-semibold leading-relaxed text-brand-800">🔐 {t('family.demo.note')}</p>
      </div>

      <SectionTitle icon="🏡">{t('games.region')}</SectionTitle>
      <button
        onClick={() => navigate('/games/region')}
        className="group flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-card hover:shadow-lift hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
      >
        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warm-50 text-warm-600">
          <HomeIcon size={24} />
        </span>
        <div className="flex-1">
          <div className="text-lg font-extrabold text-brand-900">{t('region.title')}</div>
          <div className="text-sm font-semibold text-neutral-500">{t('games.region.desc')}</div>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm group-hover:bg-brand-700 transition">
          <ChevronRightIcon size={20} />
        </span>
      </button>

      {/* Large viewer — read-only enlargement of a memory */}
      <Modal open={large !== null} onClose={() => setLarge(null)} title={large?.name ?? ''}>
        {large && (
          <div className="space-y-4">
            {photos[large.id] && (
              <img
                src={photos[large.id] ?? undefined}
                alt={large.name}
                className="w-full rounded-2xl object-cover shadow-card"
              />
            )}
            <div className="flex items-center gap-2">
              <Chip tone="warm">{large.relationship}</Chip>
              {large.birthday && <Chip tone="brand">🎂 {large.birthday}</Chip>}
            </div>
            {large.info && <p className="text-base font-semibold text-brand-900">💡 {large.info}</p>}
            {large.notes && <p className="rounded-2xl bg-neutral-50 px-3.5 py-3 text-sm font-semibold text-neutral-700">📝 {large.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}