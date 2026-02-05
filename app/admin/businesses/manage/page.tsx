import { requireAdminPage } from '@/lib/admin/page-guard';
import BusinessManagementClient from '../manage-client';

export const metadata = {
  title: 'Manage Businesses',
};

export default async function ManageBusinessesPage() {
  await requireAdminPage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Businesses</h1>
        <p className="text-gray-600 mt-1">Full control over imported businesses - edit, activate, deactivate, or delete</p>
      </div>

      <BusinessManagementClient />
    </div>
  );
}
