import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, AlertCircle, ArrowRight, Pill, ArrowLeft } from 'lucide-react';
import {
  allMedicines,
  medicineCategories,
  TOTAL_MEDICINE_COUNT,
  TOTAL_CATEGORY_COUNT,
} from '../data/medicineDatabase';
import { CATEGORY_ICON_MAP } from '../utils/categoryIcons';
import PrescriptionBadge from '../components/PrescriptionBadge';

export default function Search() {
  const [query, setQuery] = useState("");

  const searchMode = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allMedicines.filter((m) =>
      [
        m.brandName,
        m.genericName,
        m.usedFor,
        m.whenToUse,
        m.categoryName,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 relative text-center">
          <Link
            to="/home"
            className="absolute left-0 top-0 mv-button mv-button-secondary"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Home
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2 tracking-tight">
            Medicine Knowledge Base
          </h1>
          <p className="text-slate-400 mb-2">
            Browse {TOTAL_MEDICINE_COUNT} medicines across {TOTAL_CATEGORY_COUNT} categories
          </p>
          <p className="text-xs text-slate-500">Mode: {searchMode ? 'Search' : 'Browse by Category'}</p>
        </header>

        <div className="relative max-w-3xl mx-auto mb-10">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search by brand name, generic name, or composition..."
            className="block w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {!searchMode && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-[0.2em] text-slate-400 font-mono">Browse by Category</h2>
              <span className="text-xs text-slate-500">{TOTAL_CATEGORY_COUNT} categories</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {medicineCategories.map((category) => {
                const CategoryIcon = CATEGORY_ICON_MAP[category.iconKey] || Pill;
                return (
                  <Link
                    key={category.key}
                    to={`/search/category/${category.key}`}
                    className="text-left p-4 border transition-colors bg-slate-900 border-slate-800 hover:border-slate-600 block"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <CategoryIcon className="h-5 w-5 text-slate-300" />
                      <span className="text-xs text-slate-500">{category.displayCount}</span>
                    </div>
                    <p className="text-sm text-slate-100 font-medium">{category.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{category.medicines.length} shown</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {searchMode && (
          <section>
            <h3 className="text-sm uppercase tracking-[0.2em] text-slate-400 font-mono mb-5">
              Search Results ({filtered.length})
            </h3>

            {filtered.length === 0 ? (
            <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-900/40">
              <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No medicines found for “{query}”.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((med) => (
                <article
                  key={med.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-semibold text-white leading-snug">{med.brandName}</h4>
                      <p className="text-xs text-slate-400 italic">{med.genericName}</p>
                    </div>
                    <PrescriptionBadge
                      prescription={med.prescription}
                      requiresPrescription={med.requiresPrescription}
                    />
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <p><span className="text-slate-500">Used for:</span> {med.usedFor}</p>
                    <p><span className="text-slate-500">Dosage:</span> {med.dosage}</p>
                    <p><span className="text-slate-500">How to take:</span> {med.howToTake}</p>
                    <p><span className="text-slate-500">When to use:</span> {med.whenToUse}</p>
                    <p><span className="text-slate-500">When NOT to use:</span> {med.whenNotToUse}</p>
                    <p>
                      <span className="text-slate-500">Common side effects:</span>{' '}
                      {med.commonSideEffects?.slice(0, 3).join(', ') || 'N/A'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/search/category/${med.categoryKey}`}
                        className="mv-button mv-button-secondary"
                      >
                        Open Category
                      </Link>
                      <Link
                        to={med.verifyPath || '/home'}
                        className="mv-button mv-button-primary"
                      >
                        Verify This Medicine <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          </section>
        )}
      </div>
    </div>
  );
}
