import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Process, OrganizationWithMembership } from '../../types';
import { processApi, organizationApi } from '../../services/api';
import { getTagColor } from '../../utils/tagColors';
import { Star, Copy, Users, X, Building2, User, Eye, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { BPMNThumbnail } from '../bpmn/BPMNThumbnail';

interface ProcessCardProps {
  process: Process;
  onUpdate: () => void;
  onTagClick?: (tag: string) => void;
  isFirstCard?: boolean;
}

export function ProcessCard({ process, onUpdate, onTagClick, isFirstCard = false }: ProcessCardProps) {
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(process.isFavorite);
  const [showCopyToModal, setShowCopyToModal] = useState(false);
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationWithMembership[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  useEffect(() => {
    if (showCopyToModal) {
      loadOrganizations();
    }
  }, [showCopyToModal]);

  useEffect(() => {
    if (showAccessPanel && process.organizationId) {
      loadOrgMembers();
    }
  }, [showAccessPanel, process.organizationId]);

  const loadOrganizations = async () => {
    try {
      const orgs = await organizationApi.getMyOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadOrgMembers = async () => {
    if (!process.organizationId) return;
    try {
      const members = await organizationApi.getMembers(process.organizationId);
      setOrgMembers(members);
    } catch (error) {
      console.error('Failed to load org members:', error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await processApi.update(process.id, { isFavorite: !isFavorite });
      setIsFavorite(!isFavorite);
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleOpen = () => {
    navigate(`/editor/${process.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt('Enter a name for the duplicated process:', `${process.name} (Copy)`);
    if (newName) {
      try {
        await processApi.duplicate(process.id, newName);
        onUpdate();
      } catch (error) {
        console.error('Error duplicating process:', error);
        alert('Failed to duplicate process');
      }
    }
  };

  const handleCopyTo = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCopyToModal(true);
  };

  const handleCopyToOrg = async (targetOrgId: string | null) => {
    setIsCopying(true);
    try {
      // Check if copying to the same workspace (duplicate in place)
      const isSameWorkspace = targetOrgId === process.organizationId ||
        (targetOrgId === null && process.organizationId === null);

      let newName: string;
      let successMessage: string;

      if (isSameWorkspace) {
        // Duplicate in same workspace
        newName = `${process.name} (Copy)`;
        successMessage = 'Process duplicated';
      } else {
        // Copy to different workspace
        const targetName = targetOrgId
          ? organizations.find(o => o.id === targetOrgId)?.name || 'Organization'
          : 'Personal';
        newName = `${process.name} (Copy to ${targetName})`;
        successMessage = `Process copied to ${targetName}`;
      }

      await processApi.duplicate(process.id, newName, targetOrgId);
      setShowCopyToModal(false);
      onUpdate();
      alert(successMessage);
    } catch (error) {
      console.error('Error copying process:', error);
      alert('Failed to copy process');
    } finally {
      setIsCopying(false);
    }
  };

  const handleShowAccess = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAccessPanel(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${process.name}"?`)) {
      setIsDeleting(true);
      try {
        await processApi.delete(process.id);
        onUpdate();
      } catch (error) {
        console.error('Error deleting process:', error);
        alert('Failed to delete process');
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-600';
      case 'active':
        return 'bg-violet-100 text-violet-700';
      case 'archived':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  if (isDeleting) {
    return (
      <div className="bg-white rounded-2xl p-8 opacity-50 border border-slate-100">
        <div className="flex items-center justify-center gap-3 text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Deleting...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      {...(isFirstCard ? { 'data-tutorial': 'process-card' } : {})}
      className="group bg-white rounded-2xl overflow-hidden border border-violet-100 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-500/15 transition-all duration-300 cursor-pointer relative"
      onClick={handleOpen}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* BPMN Thumbnail with gradient overlay */}
      <div className="relative h-44 bg-gradient-to-br from-violet-50/50 to-slate-50 overflow-hidden">
        <BPMNThumbnail processId={process.id} className="w-full h-full" />

        {/* Gradient overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top row - Status and Favorite */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm ${getStatusColor(process.status)}`}>
            {process.status}
          </span>
          <button
            onClick={handleToggleFavorite}
            className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl backdrop-blur-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
              isFavorite
                ? 'text-amber-500 bg-amber-50/90 shadow-sm'
                : 'text-slate-400 bg-white/80 hover:text-amber-500 hover:bg-amber-50/90'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Process Info */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-800 mb-1.5 line-clamp-1 group-hover:text-slate-900 transition-colors">
            {process.name}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {process.description || 'No description provided'}
          </p>
        </div>

        {/* Tags - Compact and Modern */}
        {process.tags && process.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {process.tags.slice(0, 3).map((tag, index) => {
              const color = getTagColor(tag);
              return (
                <button
                  key={index}
                  onClick={(e) => handleTagClick(e, tag)}
                  className={`px-2.5 py-1 ${color.bg} ${color.text} text-[11px] font-medium rounded-md hover:shadow-sm transition-all`}
                  title={`Filter by tag: ${tag}`}
                >
                  {tag}
                </button>
              );
            })}
            {process.tags.length > 3 && (
              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-md">
                +{process.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats and Metadata - Modern layout */}
        <div className="flex items-center justify-between pt-5 mt-2 border-t border-slate-100 px-2">
          <span className="text-sm text-slate-400 font-medium pl-4">
            {formatDate(process.updatedAt)}
          </span>
          <div className="flex items-center gap-4 pr-4">
            <div className="flex items-center gap-2 text-slate-400" title="Views">
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">{process.viewCount || 0}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400" title="Edits">
              <Pencil className="w-4 h-4" />
              <span className="text-sm font-medium">{process.editCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Action Overlay - Clean minimal design */}
      <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent flex flex-col justify-end p-5 transition-all duration-300 ${showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Primary Action */}
        <button
          onClick={handleOpen}
          className="w-full bg-white text-slate-800 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-lg mb-3 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <ExternalLink className="w-4 h-4" />
          Open Process
        </button>

        {/* Secondary Actions Row */}
        <div className="flex gap-2">
          <button
            onClick={handleDuplicate}
            className="flex-1 bg-white/15 backdrop-blur-sm text-white px-3 py-3 min-h-[44px] rounded-lg text-xs font-medium hover:bg-white/25 transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          <button
            onClick={handleCopyTo}
            className="flex-1 bg-white/15 backdrop-blur-sm text-white px-3 py-3 min-h-[44px] rounded-lg text-xs font-medium hover:bg-white/25 transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            title="Copy to workspace"
          >
            <Building2 className="w-3.5 h-3.5" />
            Copy to...
          </button>
          <button
            onClick={handleShowAccess}
            className="bg-white/15 backdrop-blur-sm text-white px-3 py-3 min-h-[44px] min-w-[44px] rounded-lg text-xs font-medium hover:bg-white/25 transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            title="View access"
          >
            <Users className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500/80 backdrop-blur-sm text-white px-3 py-3 min-h-[44px] min-w-[44px] rounded-lg text-xs font-medium hover:bg-red-500 transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-500"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Copy To Modal - Modern Design */}
      {showCopyToModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowCopyToModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6" onClick={() => setShowCopyToModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl shadow-violet-500/10 max-w-md w-full overflow-hidden border border-violet-100" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-violet-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Copy to workspace</h3>
                  <button
                    onClick={() => setShowCopyToModal(false)}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-violet-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-1">Select destination for "{process.name}"</p>
              </div>

              {/* Options */}
              <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
                {/* Personal option */}
                <button
                  onClick={() => handleCopyToOrg(null)}
                  disabled={isCopying}
                  className={`w-full p-4 min-h-[60px] rounded-xl text-left flex items-center gap-4 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                    isCopying
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'hover:bg-violet-50/50 border border-transparent hover:border-violet-200'
                  }`}
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-700">Personal Workspace</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {process.organizationId === null ? 'Duplicate in current workspace' : 'Your private processes'}
                    </p>
                  </div>
                  {process.organizationId === null && (
                    <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs font-medium rounded-md">Current</span>
                  )}
                </button>

                {/* Organizations */}
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => handleCopyToOrg(org.id)}
                    disabled={isCopying}
                    className={`w-full p-4 min-h-[60px] rounded-xl text-left flex items-center gap-4 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                      isCopying
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'hover:bg-violet-50/50 border border-transparent hover:border-violet-200'
                    }`}
                  >
                    <div className="w-11 h-11 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">{org.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {process.organizationId === org.id ? 'Duplicate in current workspace' : `${org.memberCount || 0} members`}
                      </p>
                    </div>
                    {process.organizationId === org.id && (
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs font-medium rounded-md">Current</span>
                    )}
                  </button>
                ))}

                {organizations.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">No organizations available</p>
                  </div>
                )}
              </div>

              {/* Footer with loading state */}
              {isCopying && (
                <div className="px-6 py-4 border-t border-violet-100 bg-violet-50/50">
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <div className="w-4 h-4 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    Copying process...
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Access Panel Modal - Modern Design */}
      {showAccessPanel && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={() => setShowAccessPanel(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6" onClick={() => setShowAccessPanel(false)}>
            <div className="bg-white rounded-2xl shadow-2xl shadow-violet-500/10 max-w-md w-full overflow-hidden border border-violet-100" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-5 border-b border-violet-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">Access permissions</h3>
                  <button
                    onClick={() => setShowAccessPanel(false)}
                    className="p-1.5 hover:bg-violet-50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {process.organizationId ? (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-violet-50 rounded-xl mb-5 border border-violet-100">
                      <Building2 className="w-5 h-5 text-violet-600" />
                      <span className="text-sm font-medium text-violet-700">
                        Shared with organization members
                      </span>
                    </div>

                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {orgMembers.length > 0 ? (
                        orgMembers.map((member: any) => (
                          <div
                            key={member.userId}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-violet-50/50 transition-colors"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-violet-50 to-violet-100 rounded-full flex items-center justify-center overflow-hidden">
                              {member.user?.avatarUrl ? (
                                <img src={member.user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-violet-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {member.user?.name || member.user?.email || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-400 capitalize">{member.role}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-50 to-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-violet-600" />
                    </div>
                    <p className="text-base font-medium text-slate-700">Private to you</p>
                    <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">
                      This process is in your personal workspace and only visible to you.
                    </p>
                    <button
                      onClick={() => {
                        setShowAccessPanel(false);
                        setShowCopyToModal(true);
                      }}
                      className="mt-5 px-4 py-2 bg-violet-100 text-violet-700 text-sm font-medium rounded-lg hover:bg-violet-200 transition-colors"
                    >
                      Share via organization
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
