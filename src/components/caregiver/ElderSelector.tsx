// ============================================================================
// CAREGIVER ELDER SELECTOR
// Allows caregiver to select and switch between multiple assigned elders.
// ============================================================================

import { useEffect, useState } from 'react';
import { elderService } from '@/services/elderService';
import type { DbElderProfile } from '@/types/database';

interface ElderSelectorProps {
  selectedElderId: string;
  onSelectElder: (elder: DbElderProfile) => void;
  className?: string;
}

export function ElderSelector({
  selectedElderId,
  onSelectElder,
  className = '',
}: ElderSelectorProps) {
  const [elders, setElders] = useState<DbElderProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    elderService.getAssignedElders().then((list) => {
      if (!mounted) return;
      if (list.length > 0) {
        setElders(list);
        const match = list.find((e) => e.id === selectedElderId);
        if (!match && list[0]) {
          onSelectElder(list[0]);
        }
      } else {
        // Default fallback elders for prototype demonstration if database empty
        const defaults: DbElderProfile[] = [
          {
            id: 'e0000000-0000-0000-0000-000000000001',
            profile_id: null,
            name: 'Asha Sharma',
            age: 68,
            preferred_language: 'en',
            region: 'assam',
            interests: ['Tea', 'Music', 'Flowers'],
            onboarded: true,
            baseline_done: true,
            emergency_phone: '+91 98765 43210',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'e0000000-0000-0000-0000-000000000002',
            profile_id: null,
            name: 'Ramesh Sharma',
            age: 72,
            preferred_language: 'hi',
            region: 'assam',
            interests: ['News', 'Walks', 'Cooking'],
            onboarded: true,
            baseline_done: true,
            emergency_phone: '+91 98765 43211',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'e0000000-0000-0000-0000-000000000003',
            profile_id: null,
            name: 'Meena Devi',
            age: 65,
            preferred_language: 'gu',
            region: 'gujarat',
            interests: ['Worship', 'Crafts'],
            onboarded: true,
            baseline_done: true,
            emergency_phone: '+91 98765 43212',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
        setElders(defaults);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [selectedElderId, onSelectElder]);

  if (loading && elders.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 py-1">
        <span className="h-2 w-2 rounded-full bg-brand-400 animate-ping" />
        Loading patient records…
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 py-1 ${className}`}>
      <span className="text-xs font-extrabold uppercase tracking-wider text-brand-800 mr-1 flex items-center gap-1">
        👥 Active Patient:
      </span>
      {elders.map((elder) => {
        const isSelected = elder.id === selectedElderId || (!selectedElderId && elder.id === elders[0]?.id);
        return (
          <button
            key={elder.id}
            type="button"
            onClick={() => onSelectElder(elder)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all shadow-sm ${
              isSelected
                ? 'bg-brand-800 text-white ring-2 ring-brand-500 shadow-lift'
                : 'bg-white text-neutral-700 hover:bg-brand-50 border border-brand-100'
            }`}
          >
            <span>👤</span>
            <span>{elder.name}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-brand-900/60 text-brand-100' : 'bg-neutral-100 text-neutral-500'}`}>
              {elder.age}y
            </span>
          </button>
        );
      })}
    </div>
  );
}
