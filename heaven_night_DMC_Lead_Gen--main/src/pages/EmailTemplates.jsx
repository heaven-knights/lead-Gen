import { useEffect, useState, useRef, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';;
import {
    Loader2,
    Plus,
    FileText,
    Trash2,
    Pencil,
    X,
    Upload,
    Save,
    Paperclip,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Link,
    Eraser
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Rich Text Editor Component
   Supports: Bold, Italic, Underline,
             Bullet List, Numbered List, Links
───────────────────────────────────────────── */
function RichTextEditor({ value, onChange, placeholder, minHeight = 200 }) {
    const editorRef = useRef(null);
    const skipSyncRef = useRef(false);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        insertUnorderedList: false,
        insertOrderedList: false,
    });

    const updateActiveFormats = useCallback(() => {
        setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList'),
        });
    }, []);

    useEffect(() => {
        document.addEventListener('selectionchange', updateActiveFormats);
        return () => document.removeEventListener('selectionchange', updateActiveFormats);
    }, [updateActiveFormats]);

    // Sync incoming value into the editor only when it changes from outside
    useEffect(() => {
        if (!editorRef.current) return;
        if (skipSyncRef.current) { skipSyncRef.current = false; return; }
        const current = editorRef.current.innerHTML;
        const incoming = value || '';
        if (current !== incoming) {
            editorRef.current.innerHTML = incoming;
        }
    }, [value]);

    const handleInput = useCallback(() => {
        skipSyncRef.current = true;
        onChange(editorRef.current?.innerHTML || '');
    }, [onChange]);

    const execCmd = (command, val = null) => {
        editorRef.current?.focus();
        document.execCommand(command, false, val);
        setTimeout(() => {
            skipSyncRef.current = true;
            onChange(editorRef.current?.innerHTML || '');
            updateActiveFormats();
        }, 0);
    };

    const handleLink = () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString();
        const url = window.prompt('Enter the URL:', 'https://');
        if (!url) return;
        if (selectedText) {
            execCmd('createLink', url);
        } else {
            const linkText = window.prompt('Enter link display text:', 'Click here') || url;
            const html = `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
            editorRef.current?.focus();
            document.execCommand('insertHTML', false, html);
            setTimeout(() => {
                skipSyncRef.current = true;
                onChange(editorRef.current?.innerHTML || '');
                updateActiveFormats();
            }, 0);
        }
    };

    const ToolbarBtn = ({ onClick, title, children, danger, active }) => (
        <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onClick(); }}
            title={title}
            className={`flex items-center justify-center w-8 h-7 rounded text-sm transition-colors
                ${danger
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                    : active
                        ? 'text-white bg-blue-600 hover:bg-blue-500'
                        : 'text-gray-300 hover:text-white hover:bg-gray-600'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="border border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-850 bg-gray-800 border-b border-gray-700 flex-wrap">
                <ToolbarBtn onClick={() => execCmd('bold')} title="Bold (Ctrl+B)" active={activeFormats.bold}>
                    <Bold className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('italic')} title="Italic (Ctrl+I)" active={activeFormats.italic}>
                    <Italic className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('underline')} title="Underline (Ctrl+U)" active={activeFormats.underline}>
                    <Underline className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <div className="w-px h-5 bg-gray-600 mx-1.5" />

                <ToolbarBtn onClick={() => execCmd('insertUnorderedList')} title="Bullet List" active={activeFormats.insertUnorderedList}>
                    <List className="h-3.5 w-3.5" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => execCmd('insertOrderedList')} title="Numbered List" active={activeFormats.insertOrderedList}>
                    <ListOrdered className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <div className="w-px h-5 bg-gray-600 mx-1.5" />

                <ToolbarBtn onClick={handleLink} title="Insert / Wrap Link">
                    <Link className="h-3.5 w-3.5" />
                </ToolbarBtn>

                <div className="flex-1" />

                <ToolbarBtn onClick={() => execCmd('removeFormat')} title="Clear Formatting" danger>
                    <Eraser className="h-3.5 w-3.5" />
                </ToolbarBtn>
            </div>

            {/* ── Editable Area ── */}
            <style>{`
                .rte-editor:empty:before {
                    content: attr(data-placeholder);
                    color: #4b5563;
                    pointer-events: none;
                }
                .rte-editor ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
                .rte-editor ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
                .rte-editor a  { color: #60a5fa; text-decoration: underline; }
                .rte-editor b, .rte-editor strong { font-weight: 700; }
            `}</style>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                data-placeholder={placeholder}
                className="rte-editor bg-gray-800 text-white px-4 py-3 text-sm leading-relaxed outline-none overflow-y-auto"
                style={{ minHeight }}
            />
        </div>
    );
}

/* ─────────────────────────────────────────────
   Main EmailTemplates Page
───────────────────────────────────────────── */
export default function EmailTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'cold',
        subject: '',
        body: '',
        attachments: [],
        intro_text: '',
        outro_text: '',
        main_image_url: '',
        redirect_url: ''
    });

    const [uploading, setUploading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    const [confirmationModal, setConfirmationModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        isDestructive: false,
        isLoading: false
    });

    const closeConfirmationModal = () => {
        setConfirmationModal(prev => ({ ...prev, isOpen: false }));
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (template = null) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                type: template.type || 'cold',
                subject: template.subject || '',
                body: template.body || '',
                attachments: template.attachments || [],
                intro_text: template.intro_text || '',
                outro_text: template.outro_text || '',
                main_image_url: template.main_image_url || '',
                redirect_url: template.redirect_url || ''
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: '',
                type: 'cold',
                subject: '',
                body: '',
                attachments: [],
                intro_text: '',
                outro_text: '',
                main_image_url: '',
                redirect_url: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (formData.attachments.length >= 2) {
            toast.error('Maximum 2 attachments allowed');
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('template-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('template-files')
                .getPublicUrl(filePath);

            const newAttachment = {
                url: publicUrlData.publicUrl,
                name: file.name
            };

            setFormData(prev => ({
                ...prev,
                attachments: [...prev.attachments, newAttachment]
            }));
            toast.success('File uploaded successfully');

        } catch (err) {
            console.error('Error uploading file:', err);
            toast.error('File upload failed: ' + err.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleMainImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `main-image-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('template-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('template-files')
                .getPublicUrl(filePath);

            setFormData(prev => ({
                ...prev,
                main_image_url: publicUrlData.publicUrl
            }));
            toast.success('Image uploaded successfully');

        } catch (err) {
            console.error('Error uploading image:', err);
            toast.error('Image upload failed: ' + err.message);
        } finally {
            setUploadingImage(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    const removeAttachment = (index) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTemplate) {
                const { error } = await supabase
                    .from('email_templates')
                    .update(formData)
                    .eq('id', editingTemplate.id);
                if (error) throw error;
                toast.success('Template updated');
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Not authenticated');

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('org_id')
                    .eq('id', user.id)
                    .single();

                if (!profile?.org_id) {
                    throw new Error('User organization not found');
                }

                const { error } = await supabase
                    .from('email_templates')
                    .insert([{ ...formData, org_id: profile.org_id }]);
                if (error) throw error;
                toast.success('Template created');
            }
            fetchTemplates();
            handleCloseModal();
        } catch (err) {
            console.error('Error saving template:', err);
            toast.error('Failed to save template: ' + err.message);
        }
    };

    const handleDelete = (id) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Template',
            message: 'Are you sure you want to delete this template? This action cannot be undone.',
            confirmText: 'Delete',
            isDestructive: true,
            onConfirm: () => performDelete(id)
        });
    };

    const performDelete = async (id) => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        try {
            const { error } = await supabase
                .from('email_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Template deleted');
            setTemplates(templates.filter(t => t.id !== id));
        } catch (err) {
            console.error('Error deleting template:', err);
            toast.error('Failed to delete template');
        } finally {
            closeConfirmationModal();
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'cold': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'promotional': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'seasonal': return 'bg-green-500/10 text-green-400 border-green-500/20';
            default: return 'bg-gray-800 text-gray-400 border-gray-700';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Email Templates</h1>
                    <p className="text-gray-400">Manage your email sequences and templates.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20"
                >
                    <Plus className="h-5 w-5" />
                    New Template
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500 h-10 w-10" /></div>
            ) : templates.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
                    <div className="bg-gray-800/50 p-4 rounded-full inline-flex mb-4">
                        <FileText className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No templates yet</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">Create your first email template to start sending campaigns.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        Create Template &rarr;
                    </button>
                </div>
            ) : (
                /* ── Template Cards Grid — UNCHANGED ── */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                        <div key={template.id} className="group bg-gray-900/40 border border-gray-800 hover:border-gray-700 p-6 rounded-2xl transition-all hover:bg-gray-900/60 hover:shadow-xl flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${getTypeColor(template.type)}`}>
                                    {template.type}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpenModal(template)}
                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors truncate">
                                {template.name}
                            </h3>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                                {template.subject || 'No subject'}
                            </p>

                            <div className="mt-auto pt-4 border-t border-gray-800/50 flex items-center justify-between text-xs text-gray-500">
                                <span>{new Date(template.created_at).toLocaleDateString()}</span>
                                {template.attachments && template.attachments.length > 0 && (
                                    <span className="flex items-center gap-1 text-blue-400">
                                        <Paperclip className="h-3 w-3" />
                                        {template.attachments.length} Attachment{template.attachments.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Create / Edit Modal ── */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={handleCloseModal}
                >
                    <div
                        className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white">
                                {editingTemplate ? 'Edit Template' : 'New Template'}
                            </h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Name + Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Template Name</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Initial Outreach"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Type</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="cold">Cold Email</option>
                                        <option value="promotional">Promotional</option>
                                        <option value="seasonal">Seasonal Message</option>
                                    </select>
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Subject Line</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Quick question regarding {{company}}"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>

                            {/* ── COLD: Rich Text Body ── */}
                            {formData.type === 'cold' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Email Body</label>

                                    {/* Toolbar hint */}
                                    <p className="text-xs text-gray-500 mb-2">
                                        Use the toolbar to add <strong className="text-gray-400">bold</strong>, <em className="text-gray-400">italic</em>, bullet lists, numbered lists, and links.
                                    </p>

                                    <RichTextEditor
                                        value={formData.body}
                                        onChange={val => setFormData(prev => ({ ...prev, body: val }))}
                                        placeholder="Hi {{first_name}}, ..."
                                        minHeight={200}
                                    />

                                    <p className="text-xs text-gray-500 mt-2">
                                        Supported variables:{' '}
                                        <code className="bg-gray-800 px-1 py-0.5 rounded">{'{{company_name}}'}</code>,{' '}
                                        <code className="bg-gray-800 px-1 py-0.5 rounded">{'{{first_name}}'}</code>,{' '}
                                        <code className="bg-gray-800 px-1 py-0.5 rounded">{'{{website}}'}</code>
                                    </p>
                                </div>
                            )}

                            {/* ── PROMOTIONAL / SEASONAL ── */}
                            {(formData.type === 'promotional' || formData.type === 'seasonal') && (
                                <div className="space-y-5 border-t border-gray-800 pt-5">
                                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Promotional Content</h3>

                                    {/* Intro text — Rich Text */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Content Above Image</label>
                                        <RichTextEditor
                                            value={formData.intro_text}
                                            onChange={val => setFormData(prev => ({ ...prev, intro_text: val }))}
                                            placeholder="Intro text displayed before the main image..."
                                            minHeight={100}
                                        />
                                    </div>

                                    {/* Main Image */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Main Image</label>
                                        <div className="flex items-start gap-4">
                                            <input
                                                type="file"
                                                ref={imageInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={handleMainImageChange}
                                            />
                                            <div
                                                onClick={() => imageInputRef.current?.click()}
                                                className="w-32 h-32 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-gray-800/50 transition-all"
                                            >
                                                {formData.main_image_url ? (
                                                    <img src={formData.main_image_url} alt="Main" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <>
                                                        {uploadingImage ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" /> : <Upload className="h-6 w-6 text-gray-400 mb-2" />}
                                                        <span className="text-xs text-gray-500">{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 mb-2">Upload a high-quality image for your promotion.</p>
                                                {formData.main_image_url && (
                                                    <button type="button" onClick={() => setFormData({ ...formData, main_image_url: '' })} className="text-xs text-red-400 hover:text-red-300">Remove Image</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Outro text — Rich Text */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Content Below Image</label>
                                        <RichTextEditor
                                            value={formData.outro_text}
                                            onChange={val => setFormData(prev => ({ ...prev, outro_text: val }))}
                                            placeholder="Details or text displayed after the main image..."
                                            minHeight={100}
                                        />
                                    </div>

                                    {/* Redirect URL */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Redirect URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://your-offer-link.com"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            value={formData.redirect_url || ''}
                                            onChange={e => setFormData({ ...formData, redirect_url: e.target.value })}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Link where users will be taken when clicking the main image.</p>
                                    </div>
                                </div>
                            )}

                            {/* Attachments */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Attachments (Max 2)</label>
                                <div className="space-y-3">
                                    {formData.attachments.length < 2 && (
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv,.txt"
                                                onChange={handleFileChange}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white hover:border-gray-600 transition-all text-sm"
                                            >
                                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                                {uploading ? 'Uploading...' : 'Upload File'}
                                            </button>
                                            <p className="text-xs text-gray-500">Supported formats: PDF, Images, DOC, DOCX, XLS, XLSX, CSV, TXT (Max 5MB)</p>
                                        </div>
                                    )}

                                    {formData.attachments.length > 0 && (
                                        <div className="space-y-2">
                                            {formData.attachments.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between text-sm text-green-400 bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-900/30">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <Paperclip className="h-3 w-3 shrink-0" />
                                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline" title={file.name}>
                                                            {file.name || 'Attachment'}
                                                        </a>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(index)}
                                                        className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="h-4 w-4" />
                                    Save Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={closeConfirmationModal}
                onConfirm={confirmationModal.onConfirm}
                title={confirmationModal.title}
                message={confirmationModal.message}
                confirmText={confirmationModal.confirmText}
                isDestructive={confirmationModal.isDestructive}
                isLoading={confirmationModal.isLoading}
            />
        </div>
    );
}
