import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentText,
  HiOutlineCheckCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineTrash,
  HiOutlinePaperAirplane,
  HiOutlinePlus
} from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import { Card, Button, Badge, Input, Loader, EmptyState, Modal } from '../../components/common';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';
import '../../styles/pages/Workspace.css';

export default function Workspace() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const getQueryParam = () => new URLSearchParams(location.search).get('project');
  const activeProjectId = getQueryParam();

  const [loading, setLoading] = useState(true);
  const [myTeams, setMyTeams] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban');

  // Kanban Tasks
  const [tasks, setTasks] = useState([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskLoading, setTaskLoading] = useState(false);

  // Notes
  const [notes, setNotes] = useState([]);
  const [activeNoteIdx, setActiveNoteIdx] = useState(0);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  // Milestones
  const [milestones, setMilestones] = useState([]);
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDate, setMilestoneDate] = useState('');
  const [milestoneLoading, setMilestoneLoading] = useState(false);

  // Mock Chat Box
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'Arjun Sharma', text: 'Hey team, I set up the basic React scaffolding. Please check the repo.', time: '10:30 AM', isSelf: false },
    { id: '2', sender: 'Priya Patel', text: 'Awesome work Arjun! I will complete the Figma design wireframes by today and link it in the Notes tab.', time: '10:45 AM', isSelf: false },
    { id: '3', sender: 'Vikram Singh (Mentor)', text: 'Looks good. Make sure to define clear task boards for the ML backend as well.', time: '11:15 AM', isSelf: false }
  ]);
  const [newMsg, setNewMsg] = useState('');

  useEffect(() => {
    fetchMyTeamsList();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      fetchProjectWorkspace();
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, activeTab]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMyTeamsList = async () => {
    try {
      const res = await api.get('/projects/my-teams');
      setMyTeams(res.data.data);
      if (res.data.data.length > 0 && !activeProjectId) {
        // Auto select first project
        navigate(`/workspace?project=${res.data.data[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectWorkspace = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/${activeProjectId}`);
      setProjectDetails(res.data.data);

      // Load tasks, notes, milestones
      const [tasksRes, notesRes, milestonesRes] = await Promise.all([
        api.get(`/workspace/${activeProjectId}/tasks`),
        api.get(`/workspace/${activeProjectId}/notes`),
        api.get(`/workspace/${activeProjectId}/milestones`)
      ]);

      setTasks(tasksRes.data.data);
      
      const noteList = notesRes.data.data;
      setNotes(noteList);
      if (noteList.length > 0) {
        setNoteContent(noteList[activeNoteIdx]?.content || '');
      }

      setMilestones(milestonesRes.data.data);
    } catch (err) {
      console.error(err);
      toast.error('Error loading project workspace');
    } finally {
      setLoading(false);
    }
  };

  // Pick another project
  const handleProjectSelect = (e) => {
    navigate(`/workspace?project=${e.target.value}`);
  };

  // TASK OPERATIONS
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle) return;

    setTaskLoading(true);
    try {
      const res = await api.post(`/workspace/${activeProjectId}/tasks`, {
        title: taskTitle,
        description: taskDesc,
        assigned_to: taskAssignee || null,
        priority: taskPriority
      });
      setTasks([...tasks, res.data.data]);
      toast.success('Task created successfully');
      setTaskModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
    } catch (err) {
      toast.error('Error creating task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleMoveTask = async (taskId, currentStatus, direction) => {
    const statuses = ['todo', 'in_progress', 'review', 'done'];
    const idx = statuses.indexOf(currentStatus);
    const nextIdx = direction === 'right' ? idx + 1 : idx - 1;
    
    if (nextIdx < 0 || nextIdx >= statuses.length) return;
    const nextStatus = statuses[nextIdx];

    try {
      const res = await api.put(`/workspace/tasks/${taskId}`, { status: nextStatus });
      setTasks(tasks.map(t => t.id === taskId ? res.data.data : t));
    } catch (err) {
      toast.error('Failed to move task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/workspace/tasks/${taskId}`);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // NOTE OPERATIONS
  const handleSaveNote = async () => {
    if (!noteContent) return;
    setNoteLoading(true);

    try {
      const res = await api.post(`/workspace/${activeProjectId}/notes`, {
        content: noteContent
      });
      setNotes([res.data.data, ...notes]);
      toast.success('Document note saved');
    } catch (err) {
      toast.error('Failed to save document');
    } finally {
      setNoteLoading(false);
    }
  };

  // MILESTONE OPERATIONS
  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneTitle) return;

    setMilestoneLoading(true);
    try {
      const res = await api.post(`/workspace/${activeProjectId}/milestones`, {
        title: milestoneTitle,
        due_date: milestoneDate
      });
      setMilestones([...milestones, res.data.data]);
      setMilestoneTitle('');
      setMilestoneDate('');
      toast.success('Milestone added');
    } catch (err) {
      toast.error('Failed to create milestone');
    } finally {
      setMilestoneLoading(false);
    }
  };

  const handleToggleMilestone = async (mId, currentStatus) => {
    try {
      const res = await api.put(`/workspace/milestones/${mId}`, { completed: !currentStatus });
      setMilestones(milestones.map(m => m.id === mId ? res.data.data : m));
    } catch (err) {
      toast.error('Failed to update milestone');
    }
  };

  // CHAT OPERATIONS
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const myMessage = {
      id: Date.now().toString(),
      sender: user?.name || 'You',
      text: newMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true
    };

    setChatMessages(prev => [...prev, myMessage]);
    setNewMsg('');

    // Trigger mock response after delay
    setTimeout(() => {
      const replies = [
        "Makes sense! Let's schedule a call tomorrow to sync.",
        "Got it, looking into this now.",
        "I will update my progress on the Kanban board too.",
        "Perfect! That solves the block we had."
      ];
      const reply = {
        id: (Date.now() + 1).toString(),
        sender: 'Priya Patel',
        text: replies[Math.floor(Math.random() * replies.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: false
      };
      setChatMessages(prev => [...prev, reply]);
    }, 1500);
  };

  if (loading && myTeams.length === 0) return <Loader type="page" />;

  if (myTeams.length === 0) {
    return (
      <EmptyState
        icon={<HiOutlineClipboardDocumentList />}
        title="No Workspace Available"
        description="Workspace panels are only open to student project team members. Join or create a project to start collaborating."
        action={<Button onClick={() => navigate('/projects')}>Join a Project</Button>}
      />
    );
  }

  const tasksByColumn = (status) => tasks.filter(t => t.status === status);

  return (
    <div className="workspace-container page-enter">
      {/* Workspace Header Selector */}
      <div className="workspace-header-select">
        <div>
          <h1 className="dashboard-title">Shared Workspace</h1>
          <p className="dashboard-subtitle">Collaborate in real-time on project milestones</p>
        </div>

        <div className="workspace-project-picker">
          <Input
            type="select"
            value={activeProjectId || ''}
            onChange={handleProjectSelect}
            options={myTeams.map(t => ({ value: team => team.id, label: t.title }))}
            placeholder="Switch team workspace..."
          />
        </div>
      </div>

      {/* Roster / Project Banner Info */}
      {projectDetails && (
        <Card style={{ padding: 'var(--space-4) var(--space-6)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{projectDetails.title} Workspace</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Status: <Badge variant={projectDetails.status}>{projectDetails.status}</Badge></p>
          </div>
          {projectDetails.status === 'forming' && user?.id === projectDetails.created_by && (
            <Button size="sm" onClick={() => navigate(`/projects/${projectDetails.id}`)}>
              Manage Applications
            </Button>
          )}
        </Card>
      )}

      {/* Tabs */}
      <div className="workspace-tabs">
        <button
          className={`workspace-tab-btn ${activeTab === 'kanban' ? 'active' : ''}`}
          onClick={() => setActiveTab('kanban')}
        >
          <HiOutlineClipboardDocumentList style={{ marginRight: 6 }} /> Tasks Board
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <HiOutlineDocumentText style={{ marginRight: 6 }} /> Shared Notes
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          <HiOutlineCheckCircle style={{ marginRight: 6 }} /> Milestones
        </button>
        <button
          className={`workspace-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <HiOutlineChatBubbleLeftRight style={{ marginRight: 6 }} /> Team Chat
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. Kanban Board */}
      {activeTab === 'kanban' && (
        <div className="kanban-container">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
            <Button icon={<HiOutlinePlus />} onClick={() => setTaskModalOpen(true)}>
              Add Task
            </Button>
          </div>

          <div className="kanban-board">
            {['todo', 'in_progress', 'review', 'done'].map((column) => {
              const columnTasks = tasksByColumn(column);
              const headingLabel = column.replace('_', ' ');

              return (
                <div key={column} className="kanban-column">
                  <div className="column-header">
                    <span className="column-title">{headingLabel}</span>
                    <span className="column-count">{columnTasks.length}</span>
                  </div>

                  <div className="kanban-tasks-list">
                    {columnTasks.map((t) => (
                      <div key={t.id} className="task-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span className="task-card-title">{t.title}</span>
                          <button className="task-move-btn" onClick={() => handleDeleteTask(t.id)}>
                            <HiOutlineTrash style={{ color: 'var(--error)', width: 12, height: 12 }} />
                          </button>
                        </div>
                        {t.description && <p className="task-card-desc">{t.description}</p>}
                        
                        <div className="task-meta-row">
                          <Badge variant={t.priority} size="sm">{t.priority}</Badge>
                          
                          <div className="task-action-btns">
                            {column !== 'todo' && (
                              <button className="task-move-btn" onClick={() => handleMoveTask(t.id, t.status, 'left')}>
                                <HiOutlineChevronLeft />
                              </button>
                            )}
                            {column !== 'done' && (
                              <button className="task-move-btn" onClick={() => handleMoveTask(t.id, t.status, 'right')}>
                                <HiOutlineChevronRight />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Shared Notes */}
      {activeTab === 'notes' && (
        <Card className="workspace-notes-split">
          <div className="notes-list-sidebar">
            <Button size="sm" onClick={() => { setNoteContent(''); setNoteTitle(''); }} style={{ marginBottom: 'var(--space-2)' }}>
              New Document
            </Button>
            <div className="note-sidebar-item active">
              <span className="note-sidebar-title">Figma wireframe and specs</span>
              <span className="note-sidebar-meta">Last updated 10 min ago</span>
            </div>
            {notes.map((n, idx) => (
              <div key={n.id} className={`note-sidebar-item ${idx === activeNoteIdx ? 'active' : ''}`}>
                <span className="note-sidebar-title">{n.content.slice(0, 20) || 'Untitled Note'}...</span>
                <span className="note-sidebar-meta">by {n.creator_name}</span>
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Document Notes"
              type="textarea"
              rows={12}
              placeholder="Paste Figma links, write methodology drafts, or share key API endpoints with your team..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleSaveNote} loading={noteLoading}>
                Save Document
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Milestones */}
      {activeTab === 'milestones' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)' }}>
          <Card>
            <h2>Milestones Checklist</h2>
            <div className="milestones-list" style={{ marginTop: 'var(--space-4)' }}>
              {milestones.length > 0 ? (
                milestones.map((m) => (
                  <div key={m.id} className="milestone-row">
                    <div className="milestone-info">
                      <input
                        type="checkbox"
                        checked={m.completed === 1}
                        onChange={() => handleToggleMilestone(m.id, m.completed === 1)}
                        style={{ cursor: 'pointer', transform: 'scale(1.2)' }}
                      />
                      <span className={`milestone-title-text ${m.completed === 1 ? 'completed' : ''}`}>
                        {m.title}
                      </span>
                    </div>
                    {m.due_date && <span className="milestone-date-badge">Due: {m.due_date}</span>}
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No milestones set for this project.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2>Add Milestone</h2>
            <form onSubmit={handleCreateMilestone} className="project-form" style={{ marginTop: 'var(--space-4)' }}>
              <Input
                label="Milestone Title"
                placeholder="e.g. Complete Backend API scaffold"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                required
              />
              <Input
                label="Target Due Date"
                type="text"
                placeholder="YYYY-MM-DD"
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
              <Button type="submit" fullWidth loading={milestoneLoading}>
                Add Milestone
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* 4. Team Chat */}
      {activeTab === 'chat' && (
        <div className="chat-panel page-enter">
          <div className="chat-messages">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`chat-bubble ${msg.isSelf ? 'chat-bubble-sent' : 'chat-bubble-received'}`}>
                <span className="chat-bubble-sender">{msg.sender}</span>
                <span>{msg.text}</span>
                <span className="chat-bubble-time">{msg.time}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} className="chat-input-row">
            <Input
              placeholder="Send message to team chat..."
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              style={{ marginBottom: 0, flex: 1 }}
            />
            <Button type="submit" icon={<HiOutlinePaperAirplane />} style={{ borderRadius: 'var(--radius-md)' }}>
              Send
            </Button>
          </form>
        </div>
      )}

      {/* Add Task Modal */}
      {projectDetails && (
        <Modal
          isOpen={taskModalOpen}
          onClose={() => setTaskModalOpen(false)}
          title="Create Kanban Task"
          size="md"
        >
          <form onSubmit={handleCreateTask} className="project-form">
            <Input
              label="Task Title"
              placeholder="e.g. Setup better-sqlite3 database"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
            />
            <Input
              label="Description / Specs"
              type="textarea"
              placeholder="Detail specs, references, or expected outcomes..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
            />
            <Input
              label="Assigned Teammate"
              type="select"
              value={taskAssignee}
              onChange={(e) => setTaskAssignee(e.target.value)}
              placeholder="Assign to..."
              options={projectDetails.members.map(m => ({ value: m.id, label: m.name }))}
            />
            <Input
              label="Priority Level"
              type="select"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
            <Button type="submit" fullWidth loading={taskLoading}>
              Create Task
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
