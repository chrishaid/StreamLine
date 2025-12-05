import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Process } from '../../types';
import { processApi } from '../../services/api';

interface ProcessCardProps {
  process: Process;
  onUpdate: () => void;
}

export function ProcessCard({ process, onUpdate }: ProcessCardProps) {
  const navigate = useNavigate();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isDeleting) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 opacity-50">
        <div className="text-center text-gray-500">Deleting...</div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer relative group"
      onClick={handleOpen}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(process.status)}`}>
          {process.status}
        </span>
      </div>

      {/* Process Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 pr-20">{process.name}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {process.description || 'No description'}
        </p>
      </div>

      {/* Tags */}
      {process.tags && process.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {process.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {process.tags.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded-full">
              +{process.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-3">
        <div className="flex items-center gap-3">
          <span>Updated {formatDate(process.updatedAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span title="Views">👁 {process.viewCount}</span>
          <span title="Edits">✏️ {process.editCount}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="absolute inset-0 bg-black bg-opacity-5 rounded-lg flex items-center justify-center gap-2">
          <button
            onClick={handleOpen}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Open
          </button>
          <button
            onClick={handleDuplicate}
            className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium border-2 border-gray-300 hover:border-gray-400 transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium border-2 border-red-200 hover:border-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
