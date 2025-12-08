import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Process } from '../../types';
import { processApi } from '../../services/api';
import { getTagColor } from '../../utils/tagColors';
import { Star } from 'lucide-react';
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
      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-soft transition-all cursor-pointer relative group"
      onClick={handleOpen}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* BPMN Thumbnail */}
      <div className="h-32 border-b border-slate-100 bg-slate-50">
        <BPMNThumbnail processId={process.id} className="w-full h-full" />
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Status Badge and Favorite */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-1 rounded-md transition-colors ${
              isFavorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          <span className={`px-2 py-0.5 rounded-full text-2xs font-medium uppercase tracking-wide ${getStatusColor(process.status)}`}>
            {process.status}
          </span>
        </div>

        {/* Process Info */}
        <div className="mb-3">
          <h3 className="text-base font-semibold text-slate-800 mb-1 line-clamp-1">{process.name}</h3>
          <p className="text-sm text-slate-500 line-clamp-2">
            {process.description || 'No description'}
          </p>
        </div>

        {/* Tags - Color Coded and Clickable */}
        {process.tags && process.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {process.tags.slice(0, 3).map((tag, index) => {
              const color = getTagColor(tag);
              return (
                <button
                  key={index}
                  onClick={(e) => handleTagClick(e, tag)}
                  className={`px-2 py-0.5 ${color.bg} ${color.text} text-2xs rounded-full hover:ring-1 hover:ring-offset-1 ${color.border} transition-all`}
                  title={`Filter by tag: ${tag}`}
                >
                  {tag}
                </button>
              );
            })}
            {process.tags.length > 3 && (
              <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-2xs rounded-full">
                +{process.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-2xs text-slate-400 border-t border-slate-100 pt-2 mt-2">
          <span>Updated {formatDate(process.updatedAt)}</span>
          <div className="flex items-center gap-2">
            <span title="Views">{process.viewCount} views</span>
            <span className="text-slate-200">·</span>
            <span title="Edits">{process.editCount} edits</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="absolute inset-0 bg-slate-900/5 rounded-xl flex items-center justify-center gap-2 backdrop-blur-[1px]">
          <button
            onClick={handleOpen}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors shadow-soft"
          >
            Open
          </button>
          <button
            onClick={handleDuplicate}
            className="bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:border-slate-300 transition-colors shadow-soft"
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-medium border border-red-100 hover:border-red-200 hover:bg-red-50 transition-colors shadow-soft"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
