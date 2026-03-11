import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Tag,
  Settings,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User,
  Eye,
  Mail,
  X,
  ArrowLeft,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Save,
  Upload,
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { organizationApi } from '../services/api';
import { supabase } from '../lib/supabase';
import type {
  OrganizationWithMembership,
  OrganizationMember,
  OrganizationInvitation,
  OrganizationRole,
} from '../types';

type TabType = 'members' | 'tags' | 'settings';

const roleIcons: Record<OrganizationRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<OrganizationRole, string> = {
  owner: 'text-amber-600 bg-amber-50 border-amber-200',
  admin: 'text-purple-600 bg-purple-50 border-purple-200',
  member: 'text-blue-600 bg-blue-50 border-blue-200',
  viewer: 'text-slate-600 bg-slate-50 border-slate-200',
};

export function OrganizationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<OrganizationWithMembership | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Settings state
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [orgLogoUrl, setOrgLogoUrl] = useState('');
  const [defaultInviteRole, setDefaultInviteRole] = useState<OrganizationRole>('member');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const canManage =
    organization?.currentUserRole === 'owner' || organization?.currentUserRole === 'admin';

  useEffect(() => {
    if (slug) {
      loadOrganization();
    }
  }, [slug]);

  useEffect(() => {
    if (organization) {
      loadMembers();
      if (canManage) {
        loadInvitations();
      }
      // Initialize settings form
      setOrgName(organization.name);
      setOrgDescription(organization.description || '');
      setOrgLogoUrl(organization.logoUrl || '');
      setDefaultInviteRole((organization.settings?.defaultInviteRole as OrganizationRole) || 'member');
    }
  }, [organization]);

  const loadOrganization = async () => {
    setIsLoading(true);
    try {
      const org = await organizationApi.getBySlug(slug!);
      setOrganization(org);
    } catch (err) {
      console.error('Failed to load organization:', err);
      navigate('/organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const membersList = await organizationApi.getMembers(organization!.id);
      setMembers(membersList);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const loadInvitations = async () => {
    try {
      const invites = await organizationApi.getInvitations(organization!.id);
      setInvitations(invites);
    } catch (err) {
      console.error('Failed to load invitations:', err);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setError(null);

    try {
      // Create the invitation in the database
      const invitation = await organizationApi.createInvitation(organization!.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      // Get current user's name for the email
      const { data: { user } } = await supabase.auth.getUser();
      const inviterName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'A team member';

      // Send the invitation email
      try {
        await organizationApi.sendInvitationEmail({
          email: inviteEmail.trim(),
          organizationName: organization!.name,
          inviterName,
          role: inviteRole,
          inviteToken: invitation.token,
        });
      } catch (emailError) {
        // Log but don't fail - invitation was created, just email failed
        console.warn('Failed to send invitation email:', emailError);
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      loadInvitations();
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: OrganizationRole) => {
    try {
      await organizationApi.updateMember(organization!.id, userId, { role });
      loadMembers();
    } catch (err) {
      console.error('Failed to update member role:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await organizationApi.removeMember(organization!.id, userId);
      loadMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await organizationApi.deleteInvitation(invitationId);
      loadInvitations();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  // Settings handlers
  const handleSaveProfile = async () => {
    if (!organization) return;
    setIsSavingProfile(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      await organizationApi.update(organization.id, {
        name: orgName.trim(),
        description: orgDescription.trim() || undefined,
        logoUrl: orgLogoUrl.trim() || undefined,
      });
      setSettingsSuccess('Organization profile updated successfully');
      loadOrganization(); // Refresh data
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update organization');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!organization) return;
    setIsSavingDefaults(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      await organizationApi.update(organization.id, {
        settings: { ...organization.settings, defaultInviteRole },
      });
      setSettingsSuccess('Member defaults updated successfully');
      loadOrganization();
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update defaults');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!organization || !selectedNewOwner) return;
    setIsTransferring(true);
    setSettingsError(null);

    try {
      await organizationApi.transferOwnership(organization.id, selectedNewOwner);
      setShowTransferModal(false);
      setSelectedNewOwner('');
      setSettingsSuccess('Ownership transferred successfully. You are now an admin.');
      loadOrganization();
      loadMembers();
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!organization || deleteConfirmText !== organization.name) return;
    setIsDeleting(true);
    setSettingsError(null);

    try {
      await organizationApi.delete(organization.id);
      navigate('/organizations');
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to delete organization');
      setIsDeleting(false);
    }
  };

  const isOwner = organization?.currentUserRole === 'owner';
  const admins = members.filter((m) => m.role === 'admin');

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-accent"></div>
            <p className="mt-3 text-sm text-slate-500">Loading organization...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/organizations')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </button>

          {/* Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-accent/10 to-accent/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {organization.logoUrl ? (
                  <img
                    src={organization.logoUrl}
                    alt={organization.name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-accent" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-slate-800">{organization.name}</h1>
                <p className="text-sm text-slate-500">@{organization.slug}</p>
                {organization.description && (
                  <p className="text-sm text-slate-600 mt-1">{organization.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{organization.memberCount} members</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-slate-200">
            {[
              { id: 'members', label: 'Members', icon: Users },
              { id: 'tags', label: 'Tags', icon: Tag },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.id
                    ? 'text-accent border-accent'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              {/* Invite Button */}
              {canManage && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite Member
                  </button>
                </div>
              )}

              {/* Pending Invitations */}
              {canManage && invitations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-600 mb-3">
                    Pending Invitations ({invitations.length})
                  </h3>
                  <div className="space-y-2">
                    {invitations.map((invite) => (
                      <div
                        key={invite.id}
                        className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-4"
                      >
                        <Mail className="w-5 h-5 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">{invite.email}</p>
                          <p className="text-xs text-slate-500">
                            Invited as {invite.role} · Expires{' '}
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => copyInviteLink(invite.token)}
                          className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                          title="Copy invite link"
                        >
                          {copiedToken === invite.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleCancelInvitation(invite.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {members.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-500">No members found</p>
                    <p className="text-xs text-slate-400 mt-1">Members will appear here once added</p>
                  </div>
                ) : members.map((member) => {
                  const RoleIcon = roleIcons[member.role];
                  const roleColor = roleColors[member.role];
                  const isOwner = member.role === 'owner';

                  return (
                    <div key={member.id} className="p-4 flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                        {member.user?.avatarUrl ? (
                          <img
                            src={member.user.avatarUrl}
                            alt={member.user.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-medium text-slate-600">
                            {member.user?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">
                          {member.user?.name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{member.user?.email}</p>
                      </div>

                      {/* Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${roleColor}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {member.role}
                      </span>

                      {/* Joined Date */}
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {member.joinedAt
                          ? new Date(member.joinedAt).toLocaleDateString()
                          : 'Pending'}
                      </div>

                      {/* Actions */}
                      {canManage && !isOwner && (
                        <div className="flex items-center gap-1">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateMemberRole(member.userId, e.target.value as OrganizationRole)
                            }
                            className="text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-sm text-slate-500">
                Organization tags will be shared across all members. This feature integrates with the
                existing Tags page functionality.
              </p>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Success/Error Messages */}
              {settingsSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {settingsSuccess}
                </div>
              )}
              {settingsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {settingsError}
                </div>
              )}

              {/* Organization Profile */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-medium text-slate-800 mb-4">Organization Profile</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                      placeholder="Brief description of your organization..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={orgLogoUrl}
                      onChange={(e) => setOrgLogoUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={organization?.slug || ''}
                      disabled
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      The URL slug cannot be changed after creation.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile || !orgName.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingProfile ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Member Defaults */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-medium text-slate-800 mb-4">Member Defaults</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Default Role for New Invitations
                    </label>
                    <select
                      value={defaultInviteRole}
                      onChange={(e) => setDefaultInviteRole(e.target.value as OrganizationRole)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    >
                      <option value="admin">Admin - Can manage members and settings</option>
                      <option value="member">Member - Can create and edit processes</option>
                      <option value="viewer">Viewer - Can only view processes</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      New invitations will default to this role.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveDefaults}
                      disabled={isSavingDefaults}
                      className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      {isSavingDefaults ? 'Saving...' : 'Save Defaults'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Import */}
              {canManage && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-medium text-slate-800 mb-2">Bulk Import</h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Import multiple BPMN files from a folder. Tags will be automatically derived from the folder structure.
                  </p>
                  <button
                    onClick={() => navigate('/bulk-upload')}
                    className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium"
                  >
                    <Upload className="w-4 h-4" />
                    Start Bulk Import
                  </button>
                </div>
              )}

              {/* Danger Zone */}
              {isOwner && (
                <div className="bg-white rounded-xl border-2 border-red-200 p-6">
                  <h3 className="font-medium text-red-600 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Danger Zone
                  </h3>
                  <div className="space-y-4">
                    {/* Transfer Ownership */}
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Transfer Ownership</p>
                        <p className="text-sm text-slate-500">
                          Transfer this organization to another admin.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowTransferModal(true)}
                        disabled={admins.length === 0}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Transfer
                      </button>
                    </div>
                    {admins.length === 0 && (
                      <p className="text-xs text-slate-500 -mt-2 ml-4">
                        You need at least one admin to transfer ownership.
                      </p>
                    )}

                    {/* Delete Organization */}
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">Delete Organization</p>
                        <p className="text-sm text-slate-500">
                          Permanently delete this organization and all its data.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowInviteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Invite Member</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    <option value="admin">Admin - Can manage members and settings</option>
                    <option value="member">Member - Can create and edit processes</option>
                    <option value="viewer">Viewer - Can only view processes</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="flex-1 px-4 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isInviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowTransferModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Transfer Ownership</h2>
              <p className="text-sm text-slate-500 mb-4">
                Select an admin to transfer ownership to. You will become an admin after transfer.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    New Owner
                  </label>
                  <select
                    value={selectedNewOwner}
                    onChange={(e) => setSelectedNewOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                  >
                    <option value="">Select an admin...</option>
                    {admins.map((admin) => (
                      <option key={admin.userId} value={admin.userId}>
                        {admin.user?.name || admin.user?.email || 'Unknown User'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedNewOwner('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferOwnership}
                  disabled={isTransferring || !selectedNewOwner}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTransferring ? 'Transferring...' : 'Transfer Ownership'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Organization Modal */}
      {showDeleteModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Delete Organization</h2>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                This action <strong>cannot be undone</strong>. This will permanently delete the{' '}
                <strong>{organization?.name}</strong> organization, all processes, tags, and member data.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type <strong>{organization?.name}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                    placeholder={organization?.name}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrganization}
                  disabled={isDeleting || deleteConfirmText !== organization?.name}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Organization'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
