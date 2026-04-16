import rawCategories from './medicineDatabase.generated.json';

export const medicineCategories = rawCategories.map((category) => ({
  ...category,
  medicines: category.medicines.map((medicine, idx) => ({
    ...medicine,
    id: `${category.key}-${idx + 1}`,
  })),
}));

export const allMedicines = medicineCategories.flatMap((category) =>
  category.medicines.map((medicine) => ({
    ...medicine,
    categoryKey: category.key,
    categoryName: category.name,
    categoryIconKey: category.iconKey,
  })),
);

export const TOTAL_MEDICINE_COUNT = allMedicines.length;
export const TOTAL_CATEGORY_COUNT = medicineCategories.length;
