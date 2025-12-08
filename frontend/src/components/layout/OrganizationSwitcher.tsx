import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Check, Plus, User } from 'lucide-react';
import { organizationApi } from '../../services/api';
import type { OrganizationWithMembership } from '../../types';

export function OrganizationSwitcher() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationWithMembership[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrganizationWithMembership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const [orgs, current] = await Promise.all([
        organizationApi.getMyOrganizations(),
        organizationApi.getCurrentOrganization(),
      ]);
      setOrganizations(orgs);
      setCurrentOrg(current);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrg = async (org: OrganizationWithMembership | null) => {
    try {
      await organizationApi.setCurrentOrganization(org?.id || null);
      setCurrentOrg(org);
      setIsOpen(false);
      // Optionally refresh the page to reload data in the new org context
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch organization:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="w-40 h-9 bg-slate-100 rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-sm"
      >
        {currentOrg ? (
          <>
            <div className="w-5 h-5 bg-accent/20 rounded flex items-center justify-center">
              <Building2 className="w-3 h-3 text-accent" />
            </div>
            <span className="font-medium text-slate-700 max-w-[120px] truncate">
              {currentOrg.name}
            </span>
          </>
        ) : (
          <>
            <div className="w-5 h-5 bg-slate-200 rounded flex items-center justify-center">
              <User className="w-3 h-3 text-slate-500" />
            </div>
            <span className="font-medium text-slate-600">Personal</span>
          </>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20 animate-fade-in">
            {/* Personal (No Org) */}
            <button
              onClick={() => handleSelectOrg(null)}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-slate-700 text-sm">Personal</p>
                <p className="text-xs text-slate-500">Your personal workspace</p>
              </div>
              {!currentOrg && <Check className="w-4 h-4 text-accent" />}
            </button>

            {organizations.length > 0 && (
              <>
                <div className="border-t border-slate-100 my-2" />
                <p className="px-4 py-1 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Organizations
                </p>
              </>
            )}

            {/* Organization List */}
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelectOrg(org)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                  {org.logoUrl ? (
                    <img
                      src={org.logoUrl}
                      alt={org.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <Building2 className="w-4 h-4 text-accent" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-slate-700 text-sm truncate">{org.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {org.memberCount || 0} members · {org.currentUserRole}
                  </p>
                </div>
                {currentOrg?.id === org.id && <Check className="w-4 h-4 text-accent" />}
              </button>
            ))}

            <div className="border-t border-slate-100 my-2" />

            {/* Manage Organizations Link */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/organizations');
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-600"
            >
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-sm font-medium">Manage Organizations</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
