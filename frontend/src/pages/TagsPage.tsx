import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  FolderTree,
  Hash,
  ArrowLeft,
  X,
  Check,
  Merge,
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { processApi, organizationApi } from '../services/api';
import { getTagColor } from '../utils/tagColors';
import { useAppStore } from '../store/useAppStore';
import type { Process, OrganizationTag } from '../types';

interface HierarchicalTag {
  name: string;
  fullPath: string;
  color: ReturnType<typeof getTagColor>;
  count: number;
  children: HierarchicalTag[];
  isExpanded?: boolean;
}

export function TagsPage() {
  const navigate = useNavigate();
  const { currentOrganization } = useAppStore();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [organizationTags, setOrganizationTags] = useState<OrganizationTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [parentTag, setParentTag] = useState<string>('');
  const [editTagName, setEditTagName] = useState('');
  const [mergeTargetTag, setMergeTargetTag] = useState('');

  useEffect(() => {
    fetchData();
  }, [currentOrganization]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Filter by current organization (null for personal workspace)
      const organizationId = currentOrganization?.id || null;
      const response = await processApi.getAll({ limit: 200, organizationId });
      setProcesses(response.processes);

      // Also fetch organization tags if in an organization
      if (currentOrganization?.id) {
        const tags = await organizationApi.getTags(currentOrganization.id);
        setOrganizationTags(tags);
      } else {
        setOrganizationTags([]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build hierarchical tag structure from flat tags
  const hierarchicalTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    const allTags = new Set<string>();

    // Add organization tags first (these are the "defined" tags)
    organizationTags.forEach((orgTag) => {
      allTags.add(orgTag.name);
      // Initialize count to 0 for org-defined tags
      if (!tagCounts.has(orgTag.name)) {
        tagCounts.set(orgTag.name, 0);
      }
    });

    // Count all tags from processes and collect unique paths
    processes.forEach((process) => {
      process.tags?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        allTags.add(tag);

        // Also add parent paths for hierarchy
        const parts = tag.split('/');
        for (let i = 1; i < parts.length; i++) {
          const parentPath = parts.slice(0, i).join('/');
          if (!allTags.has(parentPath)) {
            allTags.add(parentPath);
          }
        }
      });
    });

    // Build tree structure
    const rootTags: HierarchicalTag[] = [];
    const tagMap = new Map<string, HierarchicalTag>();

    // Sort tags to ensure parents are processed before children
    const sortedTags = Array.from(allTags).sort((a, b) => {
      const aDepth = a.split('/').length;
      const bDepth = b.split('/').length;
      return aDepth - bDepth || a.localeCompare(b);
    });

    sortedTags.forEach((fullPath) => {
      const parts = fullPath.split('/');
      const name = parts[parts.length - 1];
      const count = tagCounts.get(fullPath) || 0;

      const tag: HierarchicalTag = {
        name,
        fullPath,
        color: getTagColor(fullPath),
        count,
        children: [],
        isExpanded: expandedTags.has(fullPath),
      };

      tagMap.set(fullPath, tag);

      if (parts.length === 1) {
        rootTags.push(tag);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parent = tagMap.get(parentPath);
        if (parent) {
          parent.children.push(tag);
        } else {
          // If parent doesn't exist, add as root
          rootTags.push(tag);
        }
      }
    });

    return rootTags;
  }, [processes, organizationTags, expandedTags]);

  // Get flat list of all tags for search/merge
  const allFlatTags = useMemo(() => {
    const tags = new Set<string>();
    // Include organization-defined tags
    organizationTags.forEach((t) => tags.add(t.name));
    // Include tags from processes
    processes.forEach((p) => p.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [processes, organizationTags]);

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!searchQuery) return hierarchicalTags;

    const query = searchQuery.toLowerCase();

    const filterTree = (tags: HierarchicalTag[]): HierarchicalTag[] => {
      return tags
        .map((tag) => {
          const matchesSearch =
            tag.name.toLowerCase().includes(query) ||
            tag.fullPath.toLowerCase().includes(query);
          const filteredChildren = filterTree(tag.children);

          if (matchesSearch || filteredChildren.length > 0) {
            return {
              ...tag,
              children: filteredChildren,
              isExpanded: true,
            };
          }
          return null;
        })
        .filter(Boolean) as HierarchicalTag[];
    };

    return filterTree(hierarchicalTags);
  }, [hierarchicalTags, searchQuery]);

  // Get processes for selected tag
  const processesForTag = useMemo(() => {
    if (!selectedTag) return [];
    return processes.filter((p) =>
      p.tags?.some((t) => t === selectedTag || t.startsWith(selectedTag + '/'))
    );
  }, [processes, selectedTag]);

  const toggleExpand = (tagPath: string) => {
    setExpandedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagPath)) {
        next.delete(tagPath);
      } else {
        next.add(tagPath);
      }
      return next;
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const fullTagPath = parentTag ? `${parentTag}/${newTagName.trim()}` : newTagName.trim();

    setIsCreatingTag(true);
    try {
      if (currentOrganization?.id) {
        // Create tag in organization_tags table
        await organizationApi.createTag(currentOrganization.id, {
          name: fullTagPath,
        });
        await fetchData(); // Refresh data
        alert(`Tag "${fullTagPath}" created successfully!`);
      } else {
        // For personal workspace, just inform the user
        alert(`Tag "${fullTagPath}" is ready to use. Add it to processes via the editor.`);
      }
      setShowCreateModal(false);
      setNewTagName('');
      setParentTag('');
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag');
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleRenameTag = async () => {
    if (!selectedTag || !editTagName.trim()) return;

    const oldTag = selectedTag;
    const newTag = editTagName.trim();

    try {
      // Update all processes that have this tag
      const affectedProcesses = processes.filter((p) =>
        p.tags?.some((t) => t === oldTag || t.startsWith(oldTag + '/'))
      );

      for (const process of affectedProcesses) {
        const newTags = process.tags.map((t) => {
          if (t === oldTag) return newTag;
          if (t.startsWith(oldTag + '/')) return t.replace(oldTag, newTag);
          return t;
        });
        await processApi.update(process.id, { tags: newTags });
      }

      await fetchData();
      setShowEditModal(false);
      setSelectedTag(newTag);
      setEditTagName('');
    } catch (error) {
      console.error('Failed to rename tag:', error);
      alert('Failed to rename tag');
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    if (!confirm(`Delete tag "${tagToDelete}" from all processes?`)) return;

    try {
      const affectedProcesses = processes.filter((p) =>
        p.tags?.some((t) => t === tagToDelete || t.startsWith(tagToDelete + '/'))
      );

      for (const process of affectedProcesses) {
        const newTags = process.tags.filter(
          (t) => t !== tagToDelete && !t.startsWith(tagToDelete + '/')
        );
        await processApi.update(process.id, { tags: newTags });
      }

      await fetchData();
      if (selectedTag === tagToDelete) {
        setSelectedTag(null);
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('Failed to delete tag');
    }
  };

  const handleMergeTags = async () => {
    if (!selectedTag || !mergeTargetTag || selectedTag === mergeTargetTag) return;

    try {
      const affectedProcesses = processes.filter((p) =>
        p.tags?.some((t) => t === selectedTag || t.startsWith(selectedTag + '/'))
      );

      for (const process of affectedProcesses) {
        const newTags = process.tags.map((t) => {
          if (t === selectedTag) return mergeTargetTag;
          if (t.startsWith(selectedTag + '/')) {
            return t.replace(selectedTag, mergeTargetTag);
          }
          return t;
        });
        // Remove duplicates
        await processApi.update(process.id, { tags: [...new Set(newTags)] });
      }

      await fetchData();
      setShowMergeModal(false);
      setSelectedTag(mergeTargetTag);
      setMergeTargetTag('');
    } catch (error) {
      console.error('Failed to merge tags:', error);
      alert('Failed to merge tags');
    }
  };

  const renderTag = (tag: HierarchicalTag, depth: number = 0) => {
    const hasChildren = tag.children.length > 0;
    const isSelected = selectedTag === tag.fullPath;

    return (
      <div key={tag.fullPath}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
            isSelected
              ? 'bg-accent/10 ring-1 ring-accent/30'
              : 'hover:bg-slate-50'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => setSelectedTag(tag.fullPath)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(tag.fullPath);
              }}
              className="p-0.5 hover:bg-slate-200 rounded"
            >
              {tag.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          <div
            className={`w-3 h-3 rounded-full ${tag.color.bg} ring-1 ${tag.color.border}`}
          />

          <span className="flex-1 text-sm text-slate-700 font-medium">
            {tag.name}
          </span>

          {tag.count > 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {tag.count}
            </span>
          )}
        </div>

        {hasChildren && tag.isExpanded && (
          <div>
            {tag.children.map((child) => renderTag(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-hidden flex">
        {/* Left Panel - Tag Tree */}
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
              </button>
              <h1 className="text-lg font-semibold text-slate-800">Tag Manager</h1>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {currentOrganization ? currentOrganization.name : 'Personal Workspace'}
            </p>

            <div className="mb-3">
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Tag
            </button>
          </div>

          {/* Tag Tree */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-accent" />
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No tags found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create tags by adding them to processes
                </p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredTags.map((tag) => renderTag(tag))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{allFlatTags.length} tags</span>
              <span>{processes.length} processes</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Tag Details */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {selectedTag ? (
            <div className="max-w-4xl mx-auto">
              {/* Tag Header */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${
                        getTagColor(selectedTag).bg
                      } flex items-center justify-center`}
                    >
                      <Hash
                        className={`w-5 h-5 ${getTagColor(selectedTag).text}`}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-slate-800">
                        {selectedTag}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {processesForTag.length} process
                        {processesForTag.length !== 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditTagName(selectedTag);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Rename tag"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => setShowMergeModal(true)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Merge into another tag"
                    >
                      <Merge className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(selectedTag)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete tag"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Breadcrumb for hierarchical tags */}
                {selectedTag.includes('/') && (
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    {selectedTag.split('/').map((part, index, arr) => (
                      <span key={index} className="flex items-center gap-1">
                        {index > 0 && <ChevronRight className="w-3 h-3" />}
                        <button
                          onClick={() =>
                            setSelectedTag(arr.slice(0, index + 1).join('/'))
                          }
                          className="hover:text-accent transition-colors"
                        >
                          {part}
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Processes with this tag */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="font-medium text-slate-800">
                    Processes with this tag
                  </h3>
                </div>

                {processesForTag.length === 0 ? (
                  <div className="p-6 text-center">
                    <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">
                      No processes have this tag
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {processesForTag.map((process) => (
                      <div
                        key={process.id}
                        onClick={() => navigate(`/editor/${process.id}`)}
                        className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-800">
                              {process.name}
                            </h4>
                            <p className="text-sm text-slate-500 line-clamp-1">
                              {process.description || 'No description'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                process.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : process.status === 'draft'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {process.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {process.tags.map((tag) => {
                            const color = getTagColor(tag);
                            return (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 text-xs rounded-full ${color.bg} ${color.text}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tip for hierarchical tags */}
              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Use "/" in tag names to create
                  hierarchical tags (e.g., "Department/Finance/Budgeting").
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-1">
                  Select a tag
                </h3>
                <p className="text-sm text-slate-500">
                  Choose a tag from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Create New Tag
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Parent Tag (optional)
                </label>
                <select
                  value={parentTag}
                  onChange={(e) => setParentTag(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="">No parent (root level)</option>
                  {allFlatTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Enter tag name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              {(parentTag || newTagName) && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Preview:</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        getTagColor(
                          parentTag
                            ? `${parentTag}/${newTagName || 'tag'}`
                            : newTagName || 'tag'
                        ).bg
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {parentTag
                        ? `${parentTag}/${newTagName || 'tag'}`
                        : newTagName || 'tag'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreatingTag}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {isCreatingTag ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Rename Tag
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Name
                </label>
                <p className="text-sm text-slate-500">{selectedTag}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Name
                </label>
                <input
                  type="text"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <p className="text-xs text-slate-500">
                This will update the tag across {processesForTag.length} process
                {processesForTag.length !== 1 ? 'es' : ''}.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameTag}
                disabled={!editTagName.trim() || editTagName === selectedTag}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rename Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Merge Tag Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                Merge Tag
              </h3>
              <button
                onClick={() => setShowMergeModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Merge "{selectedTag}" into:
                </label>
                <select
                  value={mergeTargetTag}
                  onChange={(e) => setMergeTargetTag(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                >
                  <option value="">Select target tag...</option>
                  {allFlatTags
                    .filter((t) => t !== selectedTag)
                    .map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                </select>
              </div>

              <p className="text-xs text-slate-500">
                All processes with "{selectedTag}" will be updated to use the
                target tag instead. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMergeTags}
                disabled={!mergeTargetTag}
                className="px-4 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Merge Tags
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
