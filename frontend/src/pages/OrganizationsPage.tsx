import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Users,
  FileText,
  ChevronRight,
  Crown,
  Shield,
  User,
  Eye,
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { organizationApi } from '../services/api';
import type { OrganizationWithMembership, OrganizationRole } from '../types';

const roleIcons: Record<OrganizationRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<OrganizationRole, string> = {
  owner: 'text-amber-600 bg-amber-50',
  admin: 'text-purple-600 bg-purple-50',
  member: 'text-blue-600 bg-blue-50',
  viewer: 'text-slate-600 bg-slate-50',
};

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<OrganizationWithMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', description: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const orgs = await organizationApi.getMyOrganizations();
      setOrganizations(orgs);
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrg.name.trim() || !newOrg.slug.trim()) {
      setError('Name and slug are required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await organizationApi.create({
        name: newOrg.name.trim(),
        slug: newOrg.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description: newOrg.description.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewOrg({ name: '', slug: '', description: '' });
      loadOrganizations();
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectOrganization = async (org: OrganizationWithMembership) => {
    try {
      await organizationApi.setCurrentOrganization(org.id);
      navigate(`/organizations/${org.slug}`);
    } catch (err) {
      console.error('Failed to set current organization:', err);
    }
  };

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-800 mb-1">Organizations</h1>
              <p className="text-sm text-slate-500">
                Manage your organizations and team workspaces
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Organization
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>

          {/* Organizations List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-accent"></div>
              <p className="mt-3 text-sm text-slate-500">Loading organizations...</p>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-2">
                {searchQuery ? 'No organizations found' : 'No organizations yet'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create an organization to collaborate with your team'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create your first organization
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrganizations.map((org) => {
                const RoleIcon = roleIcons[org.currentUserRole || 'member'];
                const roleColor = roleColors[org.currentUserRole || 'member'];

                return (
                  <div
                    key={org.id}
                    onClick={() => handleSelectOrganization(org)}
                    className="bg-white rounded-xl border border-slate-200 p-5 hover:border-accent/50 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Logo/Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-accent/10 to-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <Building2 className="w-6 h-6 text-accent" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800 truncate">{org.name}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleColor}`}
                          >
                            <RoleIcon className="w-3 h-3" />
                            {org.currentUserRole}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 truncate">
                          {org.description || `@${org.slug}`}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <span>{org.memberCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>{org.processCount || 0}</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-accent transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Create Organization</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={newOrg.name}
                    onChange={(e) => {
                      setNewOrg({
                        ...newOrg,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                      });
                    }}
                    placeholder="Acme Inc"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL Slug
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-sm text-slate-500">
                      /organizations/
                    </span>
                    <input
                      type="text"
                      value={newOrg.slug}
                      onChange={(e) =>
                        setNewOrg({
                          ...newOrg,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      placeholder="acme-inc"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newOrg.description}
                    onChange={(e) => setNewOrg({ ...newOrg, description: e.target.value })}
                    placeholder="What does this organization do?"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrganization}
                  disabled={isCreating || !newOrg.name.trim() || !newOrg.slug.trim()}
                  className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
