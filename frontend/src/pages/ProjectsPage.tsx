import React, { useState, useEffect } from 'react';
import { getApiBase } from '../lib/apiConfig';

interface ProjectSummary {
  project_id: string;
  project_name: string;
  revision: number;
  width: number;
  height: number;
  layer_count: number;
  mask_color: string;
  finish: string;
  component_count: number;
  net_count: number;
  track_count: number;
  drc_errors: number;
  drc_pass: boolean;
}

interface ProjectsPageProps {
  onSelectProject: (projectId: string) => void;
  onOpenStudio: () => void;
  onOpenCreateModal?: () => void;
}


export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectProject, onOpenStudio, onOpenCreateModal }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New Project Form state
  const [newName, setNewName] = useState('');
  const [newWidth, setNewWidth] = useState('50');
  const [newHeight, setNewHeight] = useState('35');
  const [newLayers, setNewLayers] = useState('2');
  const [newMask, setNewMask] = useState('black');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.warn('Could not fetch projects list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete project "${projectId}"?`)) {
      return;
    }
    try {
      const res = await fetch(`${getApiBase()}/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchProjects();
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const projId = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      const res = await fetch(`${getApiBase()}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projId || `project-${Date.now()}`,
          project_name: newName,
          width: parseFloat(newWidth) || 50.0,
          height: parseFloat(newHeight) || 35.0,
          layers: parseInt(newLayers) || 2,
          mask_color: newMask,
          finish: 'ENIG',
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        await fetchProjects();
        onSelectProject(projId);
        onOpenStudio();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.project_name.toLowerCase().includes(q) ||
      p.project_id.toLowerCase().includes(q) ||
      p.mask_color.toLowerCase().includes(q)
    );
  });

  const totalComponents = projects.reduce((acc, p) => acc + p.component_count, 0);
  const totalRevisions = projects.reduce((acc, p) => acc + p.revision, 0);

  return (
    <div className="flex-1 overflow-y-auto w-full h-full" style={{ background: '#090b10', color: '#f8fafc', padding: '32px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '6px' }}>
              Hardware Projects
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>
              Manage schematics, active PCB layouts, and KiCad revision archives.
            </p>
          </div>

          <button
            onClick={() => {
              if (onOpenCreateModal) {
                onOpenCreateModal();
              } else {
                setShowCreateModal(true);
              }
            }}
            className="btn btn-primary"
            style={{ fontSize: '13px', padding: '8px 18px', fontWeight: 600 }}
          >
            + Create New Project
          </button>
        </div>

        {/* Metrics Overview Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '14px',
            marginBottom: '32px',
          }}
        >
          <div style={{ background: '#0e121b', border: '1px solid #1c2436', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              Total Projects
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#00e5ff' }}>
              {projects.length}
            </div>
          </div>

          <div style={{ background: '#0e121b', border: '1px solid #1c2436', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              Placed Components
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
              {totalComponents}
            </div>
          </div>

          <div style={{ background: '#0e121b', border: '1px solid #1c2436', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              Total ECO Revisions
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b' }}>
              rev {totalRevisions}
            </div>
          </div>

          <div style={{ background: '#0e121b', border: '1px solid #1c2436', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              Cloud Sync Status
            </div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginTop: '6px' }}>
              Cloud Storage Active
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center justify-between" style={{ gap: '12px', marginBottom: '20px' }}>
          <div className="flex items-center flex-1" style={{ maxWidth: '400px', background: '#0d111a', border: '1px solid #1c2436', borderRadius: '8px', padding: '6px 12px', gap: '8px' }}>
            <span style={{ color: '#64748b', fontSize: '13px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search recent projects by name, ID, or color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontSize: '12px', outline: 'none', width: '100%' }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center" style={{ gap: '8px' }}>
            <button
              onClick={fetchProjects}
              className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '6px 12px', border: '1px solid #1c2436', color: '#94a3b8' }}
              title="Refresh Projects List"
            >
              🔄 Refresh
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              Showing {filteredProjects.length} of {projects.length}
            </span>
          </div>
        </div>

        {/* Project Grid */}
        {loading ? (
          <div className="font-mono text-center" style={{ color: '#64748b', padding: '40px' }}>
            Loading hardware projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div
            style={{
              background: '#0d111a',
              border: '1px dashed #1c2436',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📐</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '6px' }}>
              {searchTerm ? 'No projects match your search' : 'No hardware projects yet'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              {searchTerm ? 'Try clearing your search term to see all projects.' : 'Create a new circuit project or chat with the AI Architect to start designing.'}
            </p>
            {searchTerm ? (
              <button onClick={() => setSearchTerm('')} className="btn btn-ghost" style={{ fontSize: '12px' }}>
                Clear Search
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onOpenCreateModal) onOpenCreateModal();
                  else setShowCreateModal(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: '13px' }}
              >
                + Create First Project
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredProjects.map((proj) => (
              <div
                key={proj.project_id}
                style={{
                  background: '#0d111a',
                  border: '1px solid #1c2436',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.2s',
                }}
              >
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                      rev {proj.revision}
                    </span>
                    <span
                      className={`badge ${proj.drc_pass ? 'badge-green' : 'badge-amber'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {proj.drc_pass ? 'DRC PASS' : `${proj.drc_errors} DRC ISSUE`}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    {proj.project_name}
                  </h3>
                  <div className="font-mono" style={{ fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                    ID: {proj.project_id}
                  </div>

                  <div
                    style={{
                      background: '#080a0f',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>Dimensions: <strong style={{ color: '#f1f5f9' }}>{proj.width} × {proj.height} mm</strong></div>
                    <div>Layers: <strong style={{ color: '#f1f5f9' }}>{proj.layer_count}-Layer FR-4</strong></div>
                    <div className="flex items-center" style={{ gap: '6px' }}>
                      <span>Solder Mask:</span>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background:
                            proj.mask_color === 'purple'
                              ? '#7e22ce'
                              : proj.mask_color === 'green'
                              ? '#059669'
                              : proj.mask_color === 'blue'
                              ? '#2563eb'
                              : '#1e2026',
                          border: '1px solid #475569',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ color: '#f1f5f9', textTransform: 'capitalize' }}>{proj.mask_color}</span>
                    </div>
                    <div>Components: <strong style={{ color: '#f1f5f9' }}>{proj.component_count} parts</strong></div>
                    <div>Nets: <strong style={{ color: '#f1f5f9' }}>{proj.net_count} nets</strong></div>
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: '8px' }}>
                  <button
                    onClick={() => {
                      onSelectProject(proj.project_id);
                      onOpenStudio();
                    }}
                    className="btn btn-primary flex-1"
                    style={{ fontSize: '12px', padding: '7px' }}
                  >
                    ⚡ Open in Studio
                  </button>
                  <a
                    href={`${getApiBase()}/projects/${proj.project_id}/export`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost font-mono"
                    style={{ fontSize: '12px', padding: '7px 12px', border: '1px solid #232c3f' }}
                    title="Export KiCad 8 ZIP Archive"
                  >
                    ⬇ ZIP
                  </a>
                  <button
                    onClick={(e) => handleDelete(proj.project_id, e)}
                    className="btn btn-ghost"
                    style={{ fontSize: '13px', padding: '7px 10px', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }}
                    title="Delete Project"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
            }}
            onClick={() => setShowCreateModal(false)}
          >
            <div
              style={{
                background: '#0d111a',
                border: '1px solid #1c2436',
                borderRadius: '12px',
                width: '420px',
                maxWidth: '92vw',
                padding: '24px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                  Create New Circuit Project
                </span>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost"
                  style={{ fontSize: '13px', padding: '2px 8px', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreate} className="flex flex-col" style={{ gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Battery Management Board"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #232c3f',
                      background: '#080a0f',
                      color: '#f8fafc',
                      fontSize: '12px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div className="flex" style={{ gap: '10px' }}>
                  <div className="flex-1">
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={newWidth}
                      onChange={(e) => setNewWidth(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #232c3f',
                        background: '#080a0f',
                        color: '#f8fafc',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={newHeight}
                      onChange={(e) => setNewHeight(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #232c3f',
                        background: '#080a0f',
                        color: '#f8fafc',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div className="flex" style={{ gap: '10px' }}>
                  <div className="flex-1">
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Layers
                    </label>
                    <select
                      value={newLayers}
                      onChange={(e) => setNewLayers(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #232c3f',
                        background: '#080a0f',
                        color: '#f8fafc',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="2">2-Layer</option>
                      <option value="4">4-Layer</option>
                      <option value="6">6-Layer</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Solder Mask
                    </label>
                    <select
                      value={newMask}
                      onChange={(e) => setNewMask(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #232c3f',
                        background: '#080a0f',
                        color: '#f8fafc',
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    >
                      <option value="black">Matte Black</option>
                      <option value="purple">Studio Purple</option>
                      <option value="green">Classic Green</option>
                      <option value="blue">ENIG Blue</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end" style={{ marginTop: '10px', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-ghost"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    Initialize Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
