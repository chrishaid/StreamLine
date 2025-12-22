import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Process, OrganizationWithMembership } from '../../types';
import { processApi, organizationApi } from '../../services/api';
import { getTagColor } from '../../utils/tagColors';
import { Star, Copy, Users, X, Building2, User } from 'lucide-react';
import { BPMNThumbnail } from '../bpmn/BPMNThumbnail';

interface ProcessCardProps {
  process: Process;
  onUpdate: () => void;
  onTagClick?: (tag: string) => void;
}

export function ProcessCard({ process, onUpdate, onTagClick }: ProcessCardProps) {
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
        return 'bg-accent/10 text-accent';
      case 'archived':
        return 'bg-amber-50 text-amber-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  if (isDeleting) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 opacity-50">
        <div className="text-center text-slate-500 text-sm">Deleting...</div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-mist-300 rounded-2xl overflow-hidden hover:border-sage/40 hover:shadow-soft-lg transition-all cursor-pointer relative group"
      onClick={handleOpen}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* BPMN Thumbnail */}
      <div className="h-40 border-b border-mist-200 bg-mist/30">
        <BPMNThumbnail processId={process.id} className="w-full h-full" />
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Status Badge and Favorite */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-xl transition-colors ${
              isFavorite ? 'text-gold bg-gold/10' : 'text-stone hover:text-gold hover:bg-gold/10'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(process.status)}`}>
            {process.status}
          </span>
        </div>

        {/* Process Info */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-forest mb-2 line-clamp-1">{process.name}</h3>
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {process.description || 'No description'}
          </p>
        </div>

        {/* Tags - Color Coded and Clickable */}
        {process.tags && process.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {process.tags.slice(0, 3).map((tag, index) => {
              const color = getTagColor(tag);
              return (
                <button
                  key={index}
                  onClick={(e) => handleTagClick(e, tag)}
                  className={`px-3 py-1.5 ${color.bg} ${color.text} text-xs rounded-full hover:ring-1 hover:ring-offset-1 ${color.border} transition-all`}
                  title={`Filter by tag: ${tag}`}
                >
                  {tag}
                </button>
              );
            })}
            {process.tags.length > 3 && (
              <span className="px-3 py-1.5 bg-mist text-stone text-xs rounded-full">
                +{process.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-stone border-t border-mist-200 pt-4 mt-4">
          <span>Updated {formatDate(process.updatedAt)}</span>
          <div className="flex items-center gap-3">
            <span title="Views">{process.viewCount} views</span>
            <span className="text-mist-400">·</span>
            <span title="Edits">{process.editCount} edits</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="absolute inset-0 bg-slate-900/5 rounded-2xl flex items-center justify-center gap-3 backdrop-blur-[1px]">
          <button
            onClick={handleOpen}
            className="bg-sage text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-sage-600 transition-colors shadow-soft"
          >
            Open
          </button>
          <button
            onClick={handleDuplicate}
            className="bg-white text-slate-700 px-4 py-3 rounded-xl text-sm font-medium border border-mist-300 hover:border-sage transition-colors shadow-soft"
            title="Duplicate in current workspace"
          >
            Duplicate
          </button>
          <button
            onClick={handleCopyTo}
            className="bg-white text-slate-700 px-4 py-3 rounded-xl text-sm font-medium border border-mist-300 hover:border-sage transition-colors shadow-soft flex items-center gap-2"
            title="Copy to another organization"
          >
            <Copy className="w-4 h-4" />
            Copy to...
          </button>
          <button
            onClick={handleShowAccess}
            className="bg-white text-slate-700 px-4 py-3 rounded-xl text-sm font-medium border border-mist-300 hover:border-sage transition-colors shadow-soft flex items-center gap-2"
            title="View access"
          >
            <Users className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="bg-white text-ember px-4 py-3 rounded-xl text-sm font-medium border border-ember/20 hover:border-ember/40 hover:bg-ember/5 transition-colors shadow-soft"
          >
            Delete
          </button>
        </div>
      )}

      {/* Copy To Modal */}
      {showCopyToModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCopyToModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6" onClick={() => setShowCopyToModal(false)}>
            <div className="bg-white rounded-2xl shadow-soft-lg max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-forest">Copy to...</h3>
                <button onClick={() => setShowCopyToModal(false)} className="p-2 hover:bg-mist rounded-xl transition-colors">
                  <X className="w-5 h-5 text-stone" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-6">Select where to copy "{process.name}"</p>

              <div className="space-y-3">
                {/* Personal option */}
                <button
                  onClick={() => handleCopyToOrg(null)}
                  disabled={isCopying}
                  className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-colors ${
                    isCopying
                      ? 'border-mist bg-mist/50 text-stone cursor-not-allowed'
                      : 'border-mist-300 hover:border-sage hover:bg-sage/5'
                  }`}
                >
                  <div className="w-10 h-10 bg-mist rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-stone" />
                  </div>
                  <div>
                    <p className="font-medium text-forest">Personal Workspace</p>
                    <p className="text-xs text-stone mt-1">
                      {process.organizationId === null ? 'Duplicate here' : 'Your private processes'}
                    </p>
                  </div>
                  {process.organizationId === null && (
                    <span className="ml-auto text-xs text-sage font-medium">(Current)</span>
                  )}
                </button>

                {/* Organizations */}
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => handleCopyToOrg(org.id)}
                    disabled={isCopying}
                    className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-colors ${
                      isCopying
                        ? 'border-mist bg-mist/50 text-stone cursor-not-allowed'
                        : 'border-mist-300 hover:border-sage hover:bg-sage/5'
                    }`}
                  >
                    <div className="w-10 h-10 bg-sage/10 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-sage" />
                    </div>
                    <div>
                      <p className="font-medium text-forest">{org.name}</p>
                      <p className="text-xs text-stone mt-1">
                        {process.organizationId === org.id ? 'Duplicate here' : `${org.memberCount || 0} members`}
                      </p>
                    </div>
                    {process.organizationId === org.id && (
                      <span className="ml-auto text-xs text-sage font-medium">(Current)</span>
                    )}
                  </button>
                ))}

                {organizations.length === 0 && (
                  <p className="text-sm text-stone text-center py-6">
                    No organizations available. Create one first.
                  </p>
                )}
              </div>

              {isCopying && (
                <div className="mt-6 text-center text-sm text-stone">
                  Copying process...
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Access Panel Modal */}
      {showAccessPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAccessPanel(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-6" onClick={() => setShowAccessPanel(false)}>
            <div className="bg-white rounded-2xl shadow-soft-lg max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-forest">Who has access</h3>
                <button onClick={() => setShowAccessPanel(false)} className="p-2 hover:bg-mist rounded-xl transition-colors">
                  <X className="w-5 h-5 text-stone" />
                </button>
              </div>

              {process.organizationId ? (
                <>
                  <div className="flex items-center gap-3 mb-6 p-4 bg-sage/5 rounded-xl">
                    <Building2 className="w-5 h-5 text-sage" />
                    <span className="text-sm text-forest">
                      Shared with organization members
                    </span>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {orgMembers.length > 0 ? (
                      orgMembers.map((member: any) => (
                        <div key={member.userId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-mist/50 transition-colors">
                          <div className="w-10 h-10 bg-mist rounded-full flex items-center justify-center">
                            {member.user?.avatarUrl ? (
                              <img src={member.user.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                              <User className="w-5 h-5 text-stone" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-forest truncate">{member.user?.name || member.user?.email || 'Unknown'}</p>
                            <p className="text-xs text-stone capitalize mt-0.5">{member.role}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-stone text-center py-6">Loading members...</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-mist rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-stone" />
                  </div>
                  <p className="text-base text-forest font-medium">Private to you</p>
                  <p className="text-sm text-stone mt-2">
                    This process is in your personal workspace and is only visible to you.
                  </p>
                  <button
                    onClick={() => {
                      setShowAccessPanel(false);
                      setShowCopyToModal(true);
                    }}
                    className="mt-6 text-sm text-sage font-medium hover:underline"
                  >
                    Copy to an organization to share
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
