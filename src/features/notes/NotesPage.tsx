import { useCallback, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Note, NoteFolder } from '../../lib/appData'
import { uid } from '../../lib/ids'

type Props = {
  notes: Note[]
  onNotesChange: (notes: Note[]) => void
  noteFolders: NoteFolder[]
  onNoteFoldersChange: (noteFolders: NoteFolder[]) => void
}

export function NotesPage({ notes, onNotesChange, noteFolders, onNoteFoldersChange }: Props) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder] = useState<string>('')
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null)

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null

  const filteredNotes = useMemo(() => {
    let filtered = notes

    // Filter by folder
    if (selectedFolder) {
      filtered = filtered.filter(note => note.folder === selectedFolder)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [notes, selectedFolder, searchQuery])


  const createNewFolder = () => {
    if (!newFolderName.trim()) return

    const now = new Date().toISOString()
    const parentFolder = newFolderParentId ? noteFolders.find(f => f.id === newFolderParentId) : null

    // Generate path based on parent
    const path = parentFolder
      ? `${parentFolder.path}/${newFolderName.trim()}`
      : newFolderName.trim()

    const newFolder: NoteFolder = {
      id: uid('folder'),
      name: newFolderName.trim(),
      path,
      parentId: newFolderParentId || undefined,
      level: parentFolder ? parentFolder.level + 1 : 0,
      createdAt: now,
      updatedAt: now,
    }

    onNoteFoldersChange([...noteFolders, newFolder])
    setNewFolderName('')
    setNewFolderParentId(null)
  }

  const createNewNote = (folderPath?: string) => {
    const now = new Date().toISOString()
    const newNote: Note = {
      id: uid('note'),
      title: 'Новая заметка',
      content: '# Новая заметка\n\nНачните писать здесь...',
      folder: folderPath || selectedFolder || undefined,
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    onNotesChange([...notes, newNote])
    setSelectedNoteId(newNote.id)
  }

  const updateNote = (updatedNote: Note) => {
    onNotesChange(notes.map(note => note.id === updatedNote.id ? updatedNote : note))
  }

  const deleteNote = (noteId: string) => {
    onNotesChange(notes.filter(note => note.id !== noteId))
    if (selectedNoteId === noteId) {
      setSelectedNoteId(null)
    }
  }

  return (
    <div className="pageContainer">
      <div className="notesContainer">
      {/* File tree sidebar */}
      <div className="notesSidebar">
        <div className="notesSidebarHeader">
          <div className="cardTitle">📁 Заметки</div>
          <button
            className="btn btnGhost"
            onClick={() => createNewNote()}
            title="Создать новую заметку"
          >
            +
          </button>
        </div>

        {/* Search */}
        <div className="notesSearch">
          <input
            className="input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск заметок..."
          />
        </div>

        {/* New folder input */}
        <div className="notesNewFolder">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <select
              className="input"
              value={newFolderParentId || ''}
              onChange={(e) => setNewFolderParentId(e.target.value || null)}
              style={{ flex: 1, maxWidth: '100px', minWidth: '70px' }}
            >
              <option value="">Корень</option>
              {noteFolders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {'  '.repeat(folder.level)}📁 {folder.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Имя папки..."
              style={{ flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createNewFolder()
                }
              }}
            />
            <button
              className="btn btnPrimary"
              onClick={createNewFolder}
              disabled={!newFolderName.trim()}
            >
              📁
            </button>
          </div>
        </div>

        {/* File tree */}
        <div className="notesFileTree">
          <FileTree
            notes={filteredNotes}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onCreateFolder={(folderPath) => createNewNote(folderPath)}
            noteFolders={noteFolders}
            onCreateFolderIn={(parentId) => setNewFolderParentId(parentId)}
          />
        </div>
      </div>

      {/* Editor area */}
      <div className="notesEditorArea">
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onUpdate={updateNote}
            onDelete={() => deleteNote(selectedNote.id)}
          />
        ) : (
          <div className="notesWelcome">
            <div style={{ fontSize: 64, marginBottom: 24 }}>📝</div>
            <div className="cardTitle">Добро пожаловать в Заметки</div>
            <div className="muted" style={{ fontSize: 16, marginTop: 8 }}>
              Выберите заметку слева или создайте новую
            </div>
            <button
              className="btn btnPrimary"
              onClick={() => createNewNote()}
              style={{ marginTop: 24 }}
            >
              Создать первую заметку
            </button>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

type FileTreeProps = {
  notes: Note[]
  selectedNoteId: string | null
  onSelectNote: (noteId: string) => void
  onCreateFolder: (folderPath: string) => void
  onCreateFolderIn: (parentId: string) => void
  noteFolders: NoteFolder[]
}

function FileTree({ notes, selectedNoteId, onSelectNote, onCreateFolder, onCreateFolderIn, noteFolders }: FileTreeProps) {
  // Group notes by folder
  const notesByFolder = useMemo(() => {
    const groups = new Map<string, Note[]>()
    groups.set('root', []) // Root level notes

    // Initialize all folders
    noteFolders.forEach(folder => {
      groups.set(folder.path, [])
    })

    // Add notes to their folders
    notes.forEach(note => {
      const folder = note.folder || 'root'
      if (groups.has(folder)) {
        groups.get(folder)!.push(note)
      }
    })
    return groups
  }, [notes, noteFolders])

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']))

  // Get sorted folders for display
  const sortedFolders = useMemo(() => {
    return [...noteFolders].sort((a, b) => {
      // Sort by level first, then alphabetically
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
  }, [noteFolders])

  const toggleFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder)
    } else {
      newExpanded.add(folder)
    }
    setExpandedFolders(newExpanded)
  }

  return (
    <div className="fileTree">
      {/* Root level - notes without folders */}
      {notesByFolder.has('root') && notesByFolder.get('root')!.length > 0 && (
        <div className="fileTreeItem">
          <div className="fileTreeFolderHeader" style={{ paddingLeft: '12px' }}>
            <span className="fileTreeIcon">📄</span>
            <span className="fileTreeFolderName">Заметки</span>
            <span className="fileTreeCount">({notesByFolder.get('root')!.length})</span>
          </div>
          <div className="fileTreeFiles">
            {notesByFolder.get('root')!.map(note => (
              <div
                key={note.id}
                className={`fileTreeFile ${selectedNoteId === note.id ? 'fileTreeFileSelected' : ''}`}
                onClick={() => onSelectNote(note.id)}
                style={{ paddingLeft: '32px' }}
              >
                <span className="fileTreeIcon">📄</span>
                <span className="fileTreeFileName">{note.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render folders hierarchically */}
      {sortedFolders.map((folder) => {
        const folderNotes = notesByFolder.get(folder.path) || []
        const indent = folder.level * 20 + 12

        return (
          <div key={folder.id} className="fileTreeItem">
            <div
              className="fileTreeFolderHeader"
              onClick={() => toggleFolder(folder.path)}
              style={{ paddingLeft: `${indent}px` }}
            >
              <span className="fileTreeIcon">
                {expandedFolders.has(folder.path) ? '📂' : '📁'}
              </span>
              <span className="fileTreeFolderName">{folder.name}</span>
              <span className="fileTreeCount">({folderNotes.length})</span>
            </div>

            {expandedFolders.has(folder.path) && (
              <div className="fileTreeFiles">
                {folderNotes.map(note => (
                  <div
                    key={note.id}
                    className={`fileTreeFile ${selectedNoteId === note.id ? 'fileTreeFileSelected' : ''}`}
                    onClick={() => onSelectNote(note.id)}
                    style={{ paddingLeft: `${indent + 20}px` }}
                  >
                    <span className="fileTreeIcon">📄</span>
                    <span className="fileTreeFileName">{note.title}</span>
                  </div>
                ))}
                <div
                  className="fileTreeFile fileTreeFileNew"
                  onClick={() => onCreateFolder(folder.path)}
                  style={{ paddingLeft: `${indent + 20}px` }}
                >
                  <span className="fileTreeIcon">➕</span>
                  <span className="fileTreeFileName">Новая заметка</span>
                </div>
                <div
                  className="fileTreeFile fileTreeFileNew"
                  onClick={() => onCreateFolderIn(folder.id)}
                  style={{ paddingLeft: `${indent + 20}px` }}
                >
                  <span className="fileTreeIcon">📁</span>
                  <span className="fileTreeFileName">Новая папка</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

type NoteEditorProps = {
  note: Note
  onUpdate: (note: Note) => void
  onDelete: () => void
}

function NoteEditor({ note, onUpdate, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [folder, setFolder] = useState(note.folder || '')
  const [tags, setTags] = useState(note.tags.join(', '))
  const [isEditMode, setIsEditMode] = useState(true)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const saveNote = () => {
    const now = new Date().toISOString()
    const cleanTags = tags.split(',').map(t => t.trim()).filter(Boolean)

    onUpdate({
      ...note,
      title: title.trim() || 'Без названия',
      content,
      folder: folder.trim() || undefined,
      tags: cleanTags,
      updatedAt: now,
    })
  }

  // Auto-save on content change
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    // Auto-save after a delay
    setTimeout(saveNote, 1000)
  }

  const insertText = useCallback((before: string, after: string = '', placeholder: string = 'текст') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newContent = content.substring(0, start) + before + textToInsert + after + content.substring(end)
    setContent(newContent)

    // Set cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + textToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [content, setContent])

  const formattingActions = [
    { label: 'H1', before: '# ', after: '\n\n', placeholder: 'Заголовок', icon: 'H₁' },
    { label: 'H2', before: '## ', after: '\n\n', placeholder: 'Заголовок', icon: 'H₂' },
    { label: 'H3', before: '### ', after: '\n\n', placeholder: 'Заголовок', icon: 'H₃' },
    { label: 'Жирный', before: '**', after: '**', placeholder: 'жирный текст', icon: 'B' },
    { label: 'Курсив', before: '*', after: '*', placeholder: 'курсив', icon: 'I' },
    { label: 'Код', before: '`', after: '`', placeholder: 'код', icon: '</>' },
    { label: 'Ссылка', before: '[', after: '](url)', placeholder: 'текст ссылки', icon: '🔗' },
    { label: 'Список', before: '- ', after: '\n', placeholder: 'элемент списка', icon: '•' },
    { label: 'Нум. список', before: '1. ', after: '\n', placeholder: 'элемент списка', icon: '1.' },
    { label: 'Цитата', before: '> ', after: '\n\n', placeholder: 'цитата', icon: '"' },
  ]

  return (
    <div className="notesEditor">
      {/* Header */}
      <div className="notesEditorHeader">
        <div style={{ flex: 1 }}>
          <input
            className="notesTitleInput"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveNote}
            placeholder="Название заметки"
          />
          <div className="notesMeta">
            <input
              className="input"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              onBlur={saveNote}
              placeholder="📁 Папка"
              style={{ flex: 1, fontSize: 12 }}
            />
            <input
              className="input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onBlur={saveNote}
              placeholder="#теги через запятую"
              style={{ flex: 2, fontSize: 12 }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className={`btn ${isEditMode ? 'btnPrimary' : 'btnGhost'}`}
            onClick={() => setIsEditMode(true)}
            title="Режим редактирования"
          >
            ✏️
          </button>
          <button
            className={`btn ${!isEditMode ? 'btnPrimary' : 'btnGhost'}`}
            onClick={() => setIsEditMode(false)}
            title="Режим просмотра"
          >
            👁️
          </button>
          <button
            className="btn btnDanger"
            onClick={onDelete}
            title="Удалить заметку"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="notesToolbar">
        {formattingActions.map((action, index) => (
          <button
            key={index}
            className="notesToolbarBtn"
            onClick={() => insertText(action.before, action.after, action.placeholder)}
            title={action.label}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="notesEditorContent">
        {isEditMode ? (
          <textarea
            ref={textareaRef}
            className="notesTextarea"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Начните писать в формате Markdown..."
          />
        ) : (
          <div className="notesPreview">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 style={{ color: '#e879f9', marginBottom: '16px', fontSize: '28px' }}>{children}</h1>,
                h2: ({ children }) => <h2 style={{ color: '#a855f7', marginBottom: '12px', fontSize: '24px' }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ color: '#8b5cf6', marginBottom: '8px', fontSize: '20px' }}>{children}</h3>,
                p: ({ children }) => <p style={{ marginBottom: '12px', lineHeight: '1.6' }}>{children}</p>,
                strong: ({ children }) => <strong style={{ color: '#f59e0b', fontWeight: 'bold' }}>{children}</strong>,
                em: ({ children }) => <em style={{ color: '#10b981', fontStyle: 'italic' }}>{children}</em>,
                code: ({ children }) => <code style={{
                  background: 'rgba(0,0,0,0.2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  color: '#fbbf24'
                }}>{children}</code>,
                blockquote: ({ children }) => <blockquote style={{
                  borderLeft: '4px solid #8b5cf6',
                  paddingLeft: '16px',
                  margin: '16px 0',
                  color: 'rgba(226, 232, 240, 0.8)',
                  fontStyle: 'italic'
                }}>{children}</blockquote>,
                ul: ({ children }) => <ul style={{ marginBottom: '16px', paddingLeft: '24px' }}>{children}</ul>,
                ol: ({ children }) => <ol style={{ marginBottom: '16px', paddingLeft: '24px' }}>{children}</ol>,
                li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
              }}
            >
              {content || '*Пустая заметка*'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}