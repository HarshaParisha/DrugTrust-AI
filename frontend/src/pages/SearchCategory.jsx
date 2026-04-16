import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, AlertCircle, Pill, ArrowLeft } from 'lucide-react';
import { medicineCategories } from '../data/medicineDatabase';
import { CATEGORY_ICON_MAP } from '../utils/categoryIcons';
import PrescriptionBadge from '../components/PrescriptionBadge';

export default function SearchCategory() {
  const { categoryKey } = useParams();
  const category = medicineCategories.find((c) => c.key === categoryKey);

  if (!category) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
        <div className="max-w-5xl mx-auto text-center py-20">
          <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Category not found</h1>
          <p className="text-slate-400 mb-6">The category you opened does not exist.</p>
          <Link to="/search" className="mv-button mv-button-secondary">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICON_MAP[category.iconKey] || Pill;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Link
              to="/search"
              className="mv-button mv-button-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Categories
            </Link>
            <Link
              to="/home"
              className="mv-button mv-button-secondary"
            >
              Back to Home
            </Link>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl border border-slate-700 mb-4">
              <CategoryIcon className="h-6 w-6 text-slate-200" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{category.name}</h1>
            <p className="text-slate-400">{category.displayCount} medicines • {category.medicines.length} currently listed</p>
          </div>
        </header>

        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {category.medicines.map((med) => (
              <article key={med.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
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
                  <Link
                    to={med.verifyPath || '/home'}
                    className="mv-button mv-button-primary"
                  >
                    Verify This Medicine <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
