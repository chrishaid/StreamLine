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
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { organizationApi } from '../services/api';
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
      await organizationApi.createInvitation(organization!.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
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
                {members.map((member) => {
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
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-medium text-slate-800 mb-4">Organization Settings</h3>
              <p className="text-sm text-slate-500">
                Organization settings and configuration options will appear here.
              </p>
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
    </MainLayout>
  );
}
