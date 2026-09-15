import { useEffect, useState } from 'react';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Button, Modal, SectionTitle } from '@/components/ui';
import { saveImage, loadImage } from '@/services/storage';
import { uid } from '@/data/demoData';
import type { FamilyMemory } from '@/types';
import {
  CameraIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  HeartIcon,
  CalendarIcon,
  LightbulbIcon,
} from '@/components/Icons';
import { ElderSelector } from '@/components/caregiver/ElderSelector';
import { memoryService } from '@/services/memoryService';
import type { DbElderProfile } from '@/types/database';

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// ============================================================================
// CAREGIVER — FAMILY MEMORY MANAGER.
//
// The caregiver OWNS add / edit / delete of family memories (the elder view is
// read-only). Memories are stored in Supabase PostgreSQL + Supabase Storage,
// and synced cross-device so all family members and elders see them.
// ============================================================================
export default function FamilyMemories() {
  const { t, state, dispatch } = useApp();
  const [selectedElder, setSelectedElder] = useState<DbElderProfile | null>(null);
  const activeElderId = selectedElder?.id || state.patient?.id || 'e0000000-0000-0000-0000-000000000001';
  const elderName = selectedElder?.name || state.patient?.name || 'Asha Sharma';

  const [memoriesList, setMemoriesList] = useState<FamilyMemory[]>(state.familyMemories);
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
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    try {
      const remote = await memoryService.getMemories(activeElderId);
      const list = remote.length > 0 ? remote : state.familyMemories;
      setMemoriesList(list);

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
      setMemoriesList(state.familyMemories);
    }
  };

  useEffect(() => {
    void loadAll();
    const unsubscribe = memoryService.subscribeToMemories(activeElderId, () => {
      void loadAll();
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeElderId, state.familyMemories.length]);

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
    setPreview(photos[f.id] || null);
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
    setSaving(true);
    try {
      const id = editing?.id ?? uid('fam');
      let uploadedUrl: string | undefined = undefined;

      // Save to Supabase Storage + Database
      if (editing) {
        await memoryService.updateMemory(
          editing.id,
          activeElderId,
          {
            title: name.trim(),
            person: name.trim(),
            relationship: relationship.trim(),
            description: info.trim(),
            notes: notes.trim(),
          },
          file
        );
      } else {
        const created = await memoryService.addMemory(
          activeElderId,
          {
            title: name.trim(),
            person: name.trim(),
            relationship: relationship.trim(),
            description: info.trim(),
            notes: notes.trim(),
          },
          file
        );
        if (created?.photo) {
          uploadedUrl = created.photo;
        }
      }

      // Also cache locally for offline durability
      if (file) {
        await saveImage(`fam-${id}`, file);
      }

      const memory: FamilyMemory = {
        id,
        patientId: activeElderId,
        name: name.trim(),
        relationship: relationship.trim(),
        info: info.trim() || t('family.info.fallback'),
        birthday: birthday.trim() || undefined,
        notes: notes.trim(),
        photo: uploadedUrl || preview || undefined,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
      };

      dispatch({ type: editing ? 'UPDATE_FAMILY_MEMORY' : 'ADD_FAMILY_MEMORY', memory });
      setModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || t('err.upload'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await memoryService.deleteMemory(id);
    dispatch({ type: 'REMOVE_FAMILY_MEMORY', id });
    await loadAll();
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

      {/* Multi-Elder Selector */}
      <div className="mt-3 rounded-3xl bg-white p-3 shadow-card">
        <ElderSelector
          selectedElderId={activeElderId}
          onSelectElder={setSelectedElder}
        />
      </div>

      <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-brand-700/80">
        You manage the family memories for <b>{elderName}</b>. Add, edit or remove people — memories are saved to Supabase Cloud and sync cross-device for the elder’s album and games.
      </p>

      {/* Manager header — count + soft description */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <HeartIcon size={22} />
            </span>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-widest text-brand-600">Family Memory Manager</div>
              <div className="text-lg font-extrabold text-brand-900">
                {memoriesList.length} {memoriesList.length === 1 ? 'person' : 'people'} remembered
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
          ☁️ Photos are stored securely in Supabase Storage bucket <code>family-memories</code> and cached locally for offline recall.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {memoriesList.map((f, idx) => {
          const photo = photos[f.id];
          return (
            <Card key={f.id} className="group flex flex-col overflow-hidden p-0 fade-up">
              <div
                className="relative h-40 w-full overflow-hidden bg-gradient-to-br from-brand-50 via-warm-50 to-brand-50"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {photo ? (
                  <img
                    src={photo}
                    alt={f.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-brand-700 shadow-card ring-8 ring-brand-50">
                      {initials(f.name)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold text-brand-900">{f.name}</h3>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-50 px-3 py-1 text-xs font-bold text-warm-700">
                    <UsersIcon size={13} /> {f.relationship}
                  </span>
                </div>

                <div className="space-y-2">
                  {f.info && (
                    <div className="flex gap-2 rounded-2xl bg-brand-50/70 px-3.5 py-2.5">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                        <LightbulbIcon size={13} />
                      </span>
                      <p className="text-sm font-semibold leading-snug text-brand-900">💡 {f.info}</p>
                    </div>
                  )}
                  {f.birthday && (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-warm-50 px-3 py-1.5 text-xs font-bold text-warm-700">
                      <CalendarIcon size={13} /> 🎂 {f.birthday}
                    </div>
                  )}
                  {f.notes && (
                    <p className="rounded-2xl bg-neutral-50 px-3 py-2 text-xs font-semibold leading-relaxed text-neutral-700">📝 {f.notes}</p>
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
                    aria-label={`Delete memory of ${f.name}`}
                  >
                    <TrashIcon size={20} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {memoriesList.length === 0 && (
        <Card className="mt-5 flex flex-col items-center gap-3 py-10 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <UsersIcon size={28} />
          </span>
          <div className="text-xl font-extrabold text-brand-900">Your album awaits</div>
          <p className="max-w-md text-base font-semibold leading-relaxed text-neutral-600">Add the first family member to get started.</p>
          <Button variant="primary" onClick={openAdd} className="mt-2">
            <PlusIcon size={20} /> {t('family.add')}
          </Button>
        </Card>
      )}

      <SectionTitle icon="🔐">
        <span className="text-lg">{t('family.demo.note')}</span>
      </SectionTitle>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `✏️ ${editing.name}` : `➕ ${t('family.add')}`}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="mem-name">{t('family.name')}</label>
              <input
                id="mem-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('family.placeholder.name')}
              />
            </div>
            <div>
              <label className="label" htmlFor="mem-rel">{t('family.relationship')}</label>
              <input
                id="mem-rel"
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
              <span className="text-xs font-semibold text-neutral-600">JPG or PNG — stored safely on this device</span>
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
                  <div className="text-xs font-semibold text-neutral-600">This photo will be saved with the memory.</div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="mem-info">{t('family.info')}</label>
            <input
              id="mem-info"
              className="input"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder={t('family.placeholder.info')}
            />
          </div>

          <div>
            <label className="label" htmlFor="mem-bday">{t('family.birthday')}</label>
            <input
              id="mem-bday"
              className="input"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder={t('family.placeholder.birthday')}
            />
          </div>

          <div>
            <label className="label" htmlFor="mem-notes">{t('family.notes')}</label>
            <textarea
              id="mem-notes"
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('family.placeholder.notes')}
              rows={2}
            />
          </div>

          {error && <p className="rounded-2xl bg-danger-50 px-4 py-3 text-base font-bold text-danger-600">{error}</p>}

          <Button variant="huge" onClick={save} disabled={saving} className="!py-4">
            {saving ? '⏳ Saving to Supabase Cloud…' : `✅ ${t('common.save')}`}
          </Button>
        </div>
      </Modal>
    </div>
  );
}