'use client';

import { CategoryManagement } from '@/features/categories/category-management';
import { mockCategories } from '@/lib/mock-data';

export default function AdminCategoriesPage() {
  return <CategoryManagement categories={mockCategories} />;
}
