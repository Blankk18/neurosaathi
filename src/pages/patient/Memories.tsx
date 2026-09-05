import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/state/AppContext';
import { PageHeader } from '@/components/common';
import { Card, Button, Modal, SectionTitle } from '@/components/ui';
import { saveImage, loadImage } from '@/services/storage';
import { uid } from '@/data/demoData';
import type { FamilyMemory } from '@/types';

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
    <div>
      <PageHeader title={t('family.title')} right={
        <button onClick={openAdd} className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-3xl text-white shadow-lift" aria-label={t('family.add')}>
          +
        </button>
      } />
      {isOffline && <div className="mt-2 chip bg-warm-100 text-warm-500">🟠 {t('offline.banner')}</div>}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {family.map((f) => {
          const photo = photos[f.id];
          return (
          <Card key={f.id} className="p-4">
            <div className="flex items-center gap-4">
              {photo ? (
                <img src={photo} alt={f.name} className="h-20 w-20 rounded-full object-cover shadow-card" />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-extrabold text-brand-700">
                  {initials(f.name)}
                </span>
              )}
              <div className="flex-1">
                <div className="text-xl font-extrabold text-brand-900">{f.name}</div>
                <div className="text-base font-bold text-brand-600">{f.relationship}</div>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-base text-neutral-700">
              {f.info && <div>💡 {f.info}</div>}
              {f.birthday && <div>🎂 {f.birthday}</div>}
              {f.notes && <div className="text-sm text-neutral-500">📝 {f.notes}</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(f)} className="rounded-full bg-brand-50 px-4 py-2 text-base font-bold text-brand-700 hover:bg-brand-100">
                ✏️ {t('common.edit')}
              </button>
              <button onClick={() => remove(f.id)} className="rounded-full bg-accent-50 px-4 py-2 text-base font-bold text-accent-400 hover:bg-accent-100">
                🗑️
              </button>
            </div>
          </Card>
          );
        })}
      </div>
      {family.length === 0 && <Card className="mt-4 text-center text-neutral-500">{t('family.empty')}</Card>}

      <div className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-700">
        🔐 {t('family.demo.note')}
      </div>

      <SectionTitle icon="🏡">{t('games.region')}</SectionTitle>
      <button onClick={() => navigate('/games/region')} className="card flex w-full items-center gap-3 text-left hover:shadow-lift">
        <span className="text-4xl" aria-hidden>🏡</span>
        <div>
          <div className="text-lg font-extrabold text-brand-900">{t('region.title')}</div>
          <div className="text-sm font-semibold text-neutral-500">{t('games.region.desc')}</div>
        </div>
      </button>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `✏️ ${editing.name}` : `➕ ${t('family.add')}`}>
        <div className="space-y-4">
          <div>
            <label className="label">{t('family.name')}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('family.placeholder.name')} />
          </div>
          <div>
            <label className="label">{t('family.relationship')}</label>
            <input className="input" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder={t('family.placeholder.relationship')} />
          </div>
          <div>
            <label className="label">{t('family.photo')}</label>
            <input type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} className="input-file w-full text-base text-neutral-600" />
            {preview && <img src={preview} alt={t('family.photo')} className="mt-2 h-24 w-24 rounded-full object-cover" />}
          </div>
          <div>
            <label className="label">{t('family.info')}</label>
            <input className="input" value={info} onChange={(e) => setInfo(e.target.value)} placeholder={t('family.placeholder.info')} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">{t('family.birthday')}</label>
              <input className="input" value={birthday} onChange={(e) => setBirthday(e.target.value)} placeholder={t('family.placeholder.birthday')} />
            </div>
          </div>
          <div>
            <label className="label">{t('family.notes')}</label>
            <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('family.placeholder.notes')} rows={2} />
          </div>
          {error && <p className="font-bold text-accent-500">{error}</p>}
          <Button variant="huge" onClick={save} className="!py-4">
            ✅ {t('common.save')}
          </Button>
        </div>
      </Modal>
      <style>{`input[type="file"]{ padding:0.5rem; border:2px solid var(--tw-border-color,#e2ecdd); border-radius:1rem; }`}</style>
    </div>
  );
}