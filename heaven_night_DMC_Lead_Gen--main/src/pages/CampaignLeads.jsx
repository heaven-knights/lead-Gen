
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Search, Mail, Phone, MapPin, Building, Loader2, ArrowLeft, Download, Trash2, AlertCircle, Pencil, X, Save, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CampaignLeads() {
    const { campaignId } = useParams();
    const [leads, setLeads] = useState([]);
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterWithPhone, setFilterWithPhone] = useState(false);
    const [filterWithoutEmail, setFilterWithoutEmail] = useState(false);
    const [editingLead, setEditingLead] = useState(null);

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
        fetchCampaignAndLeads();
    }, [campaignId]);

    const fetchCampaignAndLeads = async () => {
        try {
            setLoading(true);

            // Fetch Campaign Details
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select('name, location, niche')
                .eq('id', campaignId)
                .single();

            if (campaignError) throw campaignError;
            setCampaign(campaignData);

            // Fetch Leads
            const { data, error } = await supabase
                .from('leads')
                .select('*, campaigns(name)')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = leads.map(lead => ({
            Company: lead.company_name,
            'Owner Email': lead.owner_email,
            Email: lead.primary_email,
            Phone: lead.primary_phone,
            Website: lead.website,
            Location: `${lead.city}, ${lead.country}`,
            Status: lead.status || 'scraped',
            Added: new Date(lead.created_at).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        XLSX.writeFile(wb, `${campaign.name}_leads.xlsx`);
    };

    const filteredLeads = leads.filter(lead => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || (
            (lead.company_name?.toLowerCase() || '').includes(term) ||
            (lead.primary_email?.toLowerCase() || '').includes(term) ||
            (lead.owner_email?.toLowerCase() || '').includes(term) ||
            (lead.primary_phone?.toLowerCase() || '').includes(term) ||
            (lead.city?.toLowerCase() || '').includes(term)
        );
        const matchesPhone = !filterWithPhone || (lead.primary_phone && lead.primary_phone.trim() !== '');
        const matchesNoEmail = !filterWithoutEmail || (!lead.primary_email || lead.primary_email.trim() === '');
        return matchesSearch && matchesPhone && matchesNoEmail;
    });

    const handleUpdateLead = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('leads')
                .update({
                    company_name: editingLead.company_name,
                    owner_email: editingLead.owner_email,
                    primary_email: editingLead.primary_email,
                    primary_phone: editingLead.primary_phone,
                    website: editingLead.website
                })
                .eq('id', editingLead.id);

            if (error) throw error;

            toast.success('Lead updated successfully');
            setLeads(leads.map(l => l.id === editingLead.id ? editingLead : l));
            setEditingLead(null);
        } catch (err) {
            console.error('Update error:', err);
            toast.error('Error updating lead: ' + err.message);
        }
    };

    const handleDeleteLead = (id) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Delete Lead',
            message: 'Are you sure you want to delete this lead? This action cannot be undone.',
            confirmText: 'Delete Lead',
            isDestructive: true,
            onConfirm: () => performDeleteLead(id)
        });
    };

    const performDeleteLead = async (id) => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        try {
            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Lead deleted successfully');
            setLeads(leads.filter(lead => lead.id !== id));
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Error deleting lead: ' + err.message);
        } finally {
            closeConfirmationModal();
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500 h-8 w-8" /></div>;
    if (!campaign) return <div className="text-white p-10">Campaign not found</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/leads" className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                            {campaign.name}
                        </h1>
                        <p className="text-gray-400 flex items-center gap-2">
                            <span>{campaign.niche}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{campaign.location}</span>
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors border border-gray-700"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search leads in this campaign..."
                    className="w-full bg-gray-900/40 border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Filter className="h-4 w-4" />
                    <span>Filters:</span>
                </div>
                <button
                    onClick={() => setFilterWithPhone(!filterWithPhone)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${filterWithPhone
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-lg shadow-blue-500/10'
                            : 'bg-gray-900/40 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                        }`}
                >
                    <Phone className="h-3.5 w-3.5" />
                    With Phone
                </button>
                <button
                    onClick={() => setFilterWithoutEmail(!filterWithoutEmail)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${filterWithoutEmail
                            ? 'bg-red-600/20 text-red-400 border-red-500/40 shadow-lg shadow-red-500/10'
                            : 'bg-gray-900/40 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
                        }`}
                >
                    <Mail className="h-3.5 w-3.5" />
                    Without Email
                </button>
                {(filterWithPhone || filterWithoutEmail) && (
                    <button
                        onClick={() => { setFilterWithPhone(false); setFilterWithoutEmail(false); }}
                        className="text-xs text-gray-500 hover:text-white transition-colors underline"
                    >
                        Clear filters
                    </button>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                    {filteredLeads.length} of {leads.length} leads
                </span>
            </div>

            {/* Leads List - Responsive Switch */}
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">

                {/* Desktop Table View (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50">
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner Email</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mail</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Website</th>
                                <th className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No leads found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-800/30 transition-colors group">
                                        <td className="px-4 py-4 max-w-[200px]">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 min-w-[2.5rem] rounded-lg bg-gray-800 flex items-center justify-center mr-3 font-bold text-gray-400 group-hover:text-white group-hover:bg-blue-600 transition-all">
                                                    {lead.company_name?.[0]?.toUpperCase() || <Building className="h-5 w-5" />}
                                                </div>
                                                <div className="font-medium text-white truncate" title={lead.company_name}>{lead.company_name || 'Unknown Company'}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 max-w-[200px]">
                                            {lead.owner_email ? (
                                                <div className="flex items-center text-sm text-gray-300 truncate" title={lead.owner_email}>
                                                    <Mail className="h-3 w-3 mr-2 text-gray-500 shrink-0" />
                                                    <span className="truncate">{lead.owner_email}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 max-w-[200px]">
                                            {lead.primary_email ? (
                                                <div className="flex items-center text-sm text-gray-300 truncate" title={lead.primary_email}>
                                                    <Mail className="h-3 w-3 mr-2 text-gray-500 shrink-0" />
                                                    <span className="truncate">{lead.primary_email}</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-300 whitespace-nowrap">
                                            {lead.primary_phone || '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${lead.status === 'replied' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                lead.status === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    'bg-gray-800 text-gray-400 border-gray-700'
                                                }`}>
                                                {lead.status || 'Scraped'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-blue-400 max-w-[200px]">
                                            {lead.website ? (
                                                <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline truncate block" title={lead.website}>
                                                    {lead.website}
                                                </a>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingLead(lead)}
                                                    className="text-gray-600 hover:text-blue-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Edit Lead"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLead(lead.id)}
                                                    className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete Lead"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View (Shown on Mobile) */}
                <div className="md:hidden space-y-4 p-4">
                    {filteredLeads.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                            No leads found matching your search.
                        </div>
                    ) : (
                        filteredLeads.map((lead) => (
                            <div key={lead.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4 space-y-3 relative group">
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <button
                                        onClick={() => setEditingLead(lead)}
                                        className="text-gray-600 hover:text-blue-400 p-1"
                                        title="Edit Lead"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLead(lead.id)}
                                        className="text-gray-600 hover:text-red-400 p-1"
                                        title="Delete Lead"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-start justify-between pr-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center font-bold text-gray-400 border border-gray-700">
                                            {lead.company_name?.[0]?.toUpperCase() || <Building className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{lead.company_name || 'Unknown Company'}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${lead.status === 'replied' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                    lead.status === 'sent' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        'bg-gray-800 text-gray-400 border-gray-700'
                                                    }`}>
                                                    {lead.status || 'Scraped'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-gray-700/50">
                                    {lead.primary_email && (
                                        <div className="flex items-center text-sm text-gray-300">
                                            <Mail className="h-4 w-4 mr-3 text-gray-500" />
                                            {lead.primary_email}
                                        </div>
                                    )}
                                    {lead.owner_email && (
                                        <div className="flex items-center text-sm text-gray-300">
                                            <Mail className="h-4 w-4 mr-3 text-purple-500" />
                                            <span className="text-purple-200">{lead.owner_email} (Owner)</span>
                                        </div>
                                    )}
                                    {lead.primary_phone && (
                                        <div className="flex items-center text-sm text-gray-300">
                                            <Phone className="h-4 w-4 mr-3 text-gray-500" />
                                            {lead.primary_phone}
                                        </div>
                                    )}
                                    {lead.website && (
                                        <div className="flex items-center text-sm text-blue-400">
                                            <div className="w-4 mr-3" /> {/* Spacer alignment */}
                                            <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                                                {lead.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

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

                {/* Edit Modal */}
                {editingLead && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setEditingLead(null)}>
                        {/* Gradient Glow Effect */}
                        <div
                            className="relative w-full max-w-lg group"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-30 blur group-hover:opacity-50 transition duration-1000 group-hover:duration-200 pointer-events-none" />

                            <div className="relative z-10 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full p-8 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto backdrop-blur-xl bg-gray-900/90 custom-scrollbar">
                                <div className="flex justify-between items-start sticky top-0 bg-gray-900/95 backdrop-blur-xl z-20 pb-4 border-b border-white/5 -mt-2 pt-2">
                                    <div>
                                        <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Edit Lead</h3>
                                        <p className="text-gray-400 text-sm mt-1">Update details for this prospect</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingLead(null)}
                                        className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateLead} className="space-y-5 pb-2">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company Name</label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Building className="h-5 w-5 text-gray-500 group-focus-within/input:text-blue-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                    placeholder="Acme Corp"
                                                    value={editingLead.company_name || ''}
                                                    onChange={e => setEditingLead({ ...editingLead, company_name: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Company Email</label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-gray-500 group-focus-within/input:text-blue-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                    placeholder="contact@example.com"
                                                    value={editingLead.primary_email || ''}
                                                    onChange={e => setEditingLead({ ...editingLead, primary_email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Owner Email</label>
                                            <div className="relative group/input">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="h-5 w-5 text-purple-500/70 group-focus-within/input:text-purple-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all placeholder-gray-600"
                                                    placeholder="owner@example.com"
                                                    value={editingLead.owner_email || ''}
                                                    onChange={e => setEditingLead({ ...editingLead, owner_email: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone</label>
                                                <div className="relative group/input">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Phone className="h-5 w-5 text-gray-500 group-focus-within/input:text-blue-400 transition-colors" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                        placeholder="+1 (555) 000-0000"
                                                        value={editingLead.primary_phone || ''}
                                                        onChange={e => setEditingLead({ ...editingLead, primary_phone: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Website</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-600"
                                                    placeholder="example.com"
                                                    value={editingLead.website || ''}
                                                    onChange={e => setEditingLead({ ...editingLead, website: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-6 border-t border-white/5 sticky bottom-0 bg-gray-900/95 backdrop-blur-xl p-4 -mx-8 -mb-8 rounded-b-2xl z-20">
                                        <button
                                            type="button"
                                            onClick={() => setEditingLead(null)}
                                            className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="relative overflow-hidden group/btn flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                                            <Save className="h-4 w-4 relative z-10" />
                                            <span className="relative z-10">Save Changes</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}
