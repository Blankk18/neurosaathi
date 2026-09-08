import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Button, Modal, SectionTitle, Chip } from '@/components/ui';
import { saveImage, loadImage } from '@/services/storage';
import { uid } from '@/data/demoData';
import type { FamilyMemory } from '@/types';
import {
  CameraIcon,
  PlusIcon,
  TrashIcon,
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

export default function Memories() {
  const { t, state, dispatch, isOffline } = useApp();
  const navigate = useNavigate();
  const family = state.familyMemories;
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<FamilyMemory | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [info, setInfo] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const [error, setError] = useState('');

  const loadAll = async () => {
    const map: Record<string, string | null> = {};
    for (const f of family) {
      const blob = await loadImage(`fam-${f.id}`);
      if (blob) map[f.id] = URL.createObjectURL(blob);
    }
    setPhotos(map);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family.length]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setRelationship('');
    setInfo('');
    setBirthday('');
    setNotes('');
    setFile(null);
    setPreview(null);
    setError('');
    setModal(true);
  };

  const openEdit = (f: FamilyMemory) => {
    setEditing(f);
    setName(f.name);
    setRelationship(f.relationship);
    setInfo(f.info);
    setBirthday(f.birthday ?? '');
    setNotes(f.notes);
    setFile(null);
    setPreview(null);
    setError('');
    setModal(true);
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else setPreview(null);
  };

  const save = async () => {
    if (!name.trim() || !relationship.trim()) {
      setError(t('err.missing'));
      return;
    }
    const id = editing?.id ?? uid('fam');
    const memory: FamilyMemory = {
      id,
      patientId: state.patient?.id ?? 'patient-asha',
      name: name.trim(),
      relationship: relationship.trim(),
      info: info.trim() || t('family.info.fallback'),
      birthday: birthday.trim() || undefined,
      notes: notes.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    if (file) {
      const ok = await saveImage(`fam-${id}`, file);
      if (!ok) setError(t('err.upload'));
    }
    dispatch({ type: editing ? 'UPDATE_FAMILY_MEMORY' : 'ADD_FAMILY_MEMORY', memory });
    setModal(false);
    loadAll();
  };

  const remove = (id: string) => {
    dispatch({ type: 'REMOVE_FAMILY_MEMORY', id });
  };

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-canvas px-4 pb-28 pt-4">
      <PageHeader
        title={t('family.title')}
        right={
          <button
            onClick={openAdd}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-white shadow-lift hover:bg-accent-600 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
            aria-label={t('family.add')}
          >
            <PlusIcon size={24} />
          </button>
        }
      />

      {/* subtle subtitle for warmth — not a translation key, keeps smoke "Family" intact */}
      <p className="mt-1 max-w-2xl text-base font-semibold leading-relaxed text-brand-700/80">
        Your cherished people, always close. Add a photo and a small note — they become gentle recall games too.
      </p>

      {isOffline && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-warm-100 px-4 py-2 text-sm font-bold text-warm-600">
          <span className="h-2 w-2 rounded-full bg-warm-400" aria-hidden />
          🟠 {t('offline.banner')}
        </div>
      )}

      {/* Album header — count + soft description */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <HeartIcon size={22} />
            </span>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-brand-600">Memory album</div>
              <div className="text-lg font-extrabold text-brand-900">
                {family.length} {family.length === 1 ? 'person' : 'people'} remembered
              </div>
            </div>
          </div>
          <button
            onClick={openAdd}
            aria-label={t('family.add')}
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-base font-bold text-white shadow-lift hover:bg-brand-700 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            <PlusIcon size={18} /> {t('family.add')}
          </button>
        </div>
        <div className="mt-4 h-px w-full bg-brand-50" />
        <p className="mt-3 text-sm font-semibold leading-relaxed text-neutral-600">
          Photos are stored on this device and appear in Family Memories games — a calm, familiar way to practice recall.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {family.map((f, idx) => {
          const photo = photos[f.id];
          return (
            <Card key={f.id} className="group flex flex-col overflow-hidden p-0 fade-up">
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
                {/* For photo cards, show name again in body for screen-reader and non-overlay fallback on light photos */}
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
                    <p className="text-sm font-semibold text-neutral-400">Add a note or birthday to make this memory richer.</p>
                  )}
                </div>

                <div className="mt-auto flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(f)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-brand-700 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
                  >
                    ✏️ {t('common.edit')}
                  </button>
                  <button
                    onClick={() => remove(f.id)}
                    className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white text-accent-600 shadow-card ring-1 ring-accent-100 hover:bg-accent-50 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-200"
                    aria-label="🗑️"
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {family.length === 0 && (
        <Card className="mt-5 flex flex-col items-center gap-3 py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <UsersIcon size={28} />
          </span>
          <div className="text-xl font-extrabold text-brand-900">Your album awaits</div>
          <p className="max-w-md text-base font-semibold leading-relaxed text-neutral-500">{t('family.empty')}</p>
          <Button variant="primary" onClick={openAdd} className="mt-2">
            <PlusIcon size={20} /> {t('family.add')}
          </Button>
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

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `✏️ ${editing.name}` : `➕ ${t('family.add')}`}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">{t('family.name')}</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('family.placeholder.name')}
              />
            </div>
            <div>
              <label className="label">{t('family.relationship')}</label>
              <input
                className="input"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder={t('family.placeholder.relationship')}
              />
            </div>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <CameraIcon size={16} /> {t('family.photo')}
            </label>
            <label className="flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-brand-200 bg-brand-50/60 px-4 py-6 text-center hover:bg-brand-50 transition cursor-pointer">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                <CameraIcon size={20} />
              </span>
              <span className="text-sm font-bold text-brand-700">{t('family.photo')}</span>
              <span className="text-xs font-semibold text-neutral-500">JPG or PNG — stored safely on this device</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                className="mt-3 block w-full text-sm text-neutral-600 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-brand-700 hover:file:bg-brand-50"
              />
            </label>
            {preview && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card">
                <img src={preview} alt={t('family.photo')} className="h-20 w-20 rounded-2xl object-cover shadow-sm" />
                <div>
                  <div className="text-sm font-extrabold text-brand-900">Preview</div>
                  <div className="text-xs font-semibold text-neutral-500">This photo will be saved with the memory.</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">{t('family.info')}</label>
            <input
              className="input"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder={t('family.placeholder.info')}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">{t('family.birthday')}</label>
              <input
                className="input"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                placeholder={t('family.placeholder.birthday')}
              />
            </div>
          </div>

          <div>
            <label className="label">{t('family.notes')}</label>
            <textarea
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('family.placeholder.notes')}
              rows={2}
            />
          </div>

          {error && <p className="rounded-2xl bg-danger-50 px-4 py-3 text-base font-bold text-danger-600">{error}</p>}

          <Button variant="huge" onClick={save} className="!py-4">
            ✅ {t('common.save')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
