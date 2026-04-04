
import { useEffect, useState, useRef } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import {
    Plus,
    Search,
    MapPin,
    Users,
    BarChart3,
    Loader2,
    Trash2,
    AlertCircle,
    Pencil,
    Check,
    X as XIcon
} from 'lucide-react';

export default function CampaignList() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const editInputRef = useRef(null);


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
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Fetch Campaigns
            const { data: campaignsData, error: campaignsError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('org_id', user.id) // Assuming user.id maps to org_id for now or direct ownership
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (campaignsError) throw campaignsError;

            // 2. Fetch Completed Batches for these campaigns
            const campaignIds = campaignsData.map(c => c.id);

            // Allow fetching all completed batches for these campaigns
            // Note: If many campaigns, this might need pagination or optimization, but fine for now.
            const { data: completedBatches, error: batchesError } = await supabase
                .from('batches')
                .select('campaign_id')
                .eq('status', 'completed')
                .in('campaign_id', campaignIds);

            if (batchesError) console.error('Error fetching batches:', batchesError);

            // 3. Aggregate counts
            const counts = {};
            if (completedBatches) {
                completedBatches.forEach(b => {
                    counts[b.campaign_id] = (counts[b.campaign_id] || 0) + 1;
                });
            }

            // 4. Merge
            const campaignsWithCounts = campaignsData.map(c => ({
                ...c,
                completed_batches: counts[c.id] || 0
            }));

            setCampaigns(campaignsWithCounts);
        } catch (err) {
            console.error('Error:', err);
            // Constructive error handling
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Real-time updates
    useEffect(() => {
        const batchChannel = supabase
            .channel('list-batches')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for any change (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'batches'
                },
                () => {
                    // Refetch to update counts
                    fetchCampaigns();
                }
            )
            .subscribe();

        const campaignChannel = supabase
            .channel('list-campaigns')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'campaigns'
                },
                () => {
                    fetchCampaigns();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(batchChannel);
            supabase.removeChannel(campaignChannel);
        };
    }, []);

    const confirmDeleteCampaign = (e, id) => {
        e.preventDefault();
        e.stopPropagation();

        setConfirmationModal({
            isOpen: true,
            title: 'Delete Campaign',
            message: 'Are you sure you want to delete this campaign?',
            confirmText: 'Delete Campaign',
            isDestructive: true,
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id) => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        try {
            // Soft delete campaign
            const { error: campaignError } = await supabase
                .from('campaigns')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (campaignError) throw campaignError;

            toast.success('Campaign deleted successfully');
            closeConfirmationModal();
            fetchCampaigns();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Error deleting campaign: ' + err.message);
            closeConfirmationModal();
        }
    };

    const startEditing = (e, campaign) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(campaign.id);
        setEditingName(campaign.name);
        setTimeout(() => editInputRef.current?.focus(), 50);
    };

    const cancelEditing = (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setEditingId(null);
        setEditingName('');
    };

    const saveNameEdit = async (e, id) => {
        e?.preventDefault();
        e?.stopPropagation();
        const trimmed = editingName.trim();
        if (!trimmed) { cancelEditing(); return; }
        try {
            const { error } = await supabase
                .from('campaigns')
                .update({ name: trimmed })
                .eq('id', id);
            if (error) throw error;
            setCampaigns(prev => prev.map(c => c.id === id ? { ...c, name: trimmed } : c));
            toast.success('Campaign name updated');
        } catch (err) {
            toast.error('Failed to update name: ' + err.message);
        } finally {
            setEditingId(null);
            setEditingName('');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'sending': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
            case 'scraping': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse';
            case 'ready': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            default: return 'bg-gray-700/30 text-gray-400 border-gray-700/50';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        Campaigns
                    </h1>
                    <p className="text-gray-400">
                        Manage your outreach campaigns and monitor performance.
                    </p>
                </div>
                <Link
                    to="/campaigns/new"
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="h-5 w-5" />
                    Create Campaign
                </Link>
            </div>

            {/* Metrics Overview (Placeholder for now, could aggregate data) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <p className="text-sm text-gray-400 font-medium">Total Active</p>
                    <p className="text-2xl font-bold text-white mt-1">{campaigns.filter(c => c.status !== 'completed' && c.status !== 'draft').length}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <p className="text-sm text-gray-400 font-medium">Total Completed</p>
                    <p className="text-2xl font-bold text-white mt-1">{campaigns.filter(c => c.status === 'completed').length}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <p className="text-sm text-gray-400 font-medium">Total Leads</p>
                    <p className="text-2xl font-bold text-white mt-1">{campaigns.reduce((acc, curr) => acc + (curr.total_filtered || 0), 0)}</p>
                </div>
            </div>

            {/* Search & Filter (Simple UI for now) */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search campaigns..."
                    className="w-full bg-gray-900/50 border border-gray-800 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                />
            </div>

            {campaigns.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
                    <div className="bg-gray-800/50 p-4 rounded-full inline-flex mb-4">
                        <BarChart3 className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No campaigns yet</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">Get started by creating your first outreach campaign to find and contact leads.</p>
                    <Link
                        to="/campaigns/new"
                        className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
                    >
                        Create your first campaign &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {campaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            className="group relative bg-gray-900/40 border border-gray-800 hover:border-gray-700 p-6 rounded-2xl transition-all hover:bg-gray-900/60 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col h-full cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="text-gray-400 text-sm"></div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => startEditing(e, campaign)}
                                        className="text-gray-600 hover:text-blue-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Rename Campaign"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => confirmDeleteCampaign(e, campaign.id)}
                                        className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Campaign"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {editingId === campaign.id ? (
                                <div className="flex items-center gap-2 mb-2" onClick={e => e.stopPropagation()}>
                                    <input
                                        ref={editInputRef}
                                        value={editingName}
                                        onChange={e => setEditingName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveNameEdit(e, campaign.id);
                                            if (e.key === 'Escape') cancelEditing(e);
                                        }}
                                        className="flex-1 bg-gray-800 border border-blue-500/50 text-white text-lg font-bold rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button onClick={e => saveNameEdit(e, campaign.id)} className="p-1 text-green-400 hover:text-green-300">
                                        <Check className="h-5 w-5" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-1 text-gray-400 hover:text-white">
                                        <XIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            ) : (
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                    {campaign.name}
                                </h3>
                            )}

                            <div className="space-y-3 mb-6 flex-1">
                                <div className="flex items-center text-gray-400 text-sm">
                                    <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                                    {campaign.location}
                                </div>
                                <div className="flex items-center text-gray-400 text-sm">
                                    <Users className="h-4 w-4 mr-2 text-gray-600" />
                                    {campaign.niche}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/50">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Leads</p>
                                    <p className="text-lg font-semibold text-white">
                                        {campaign.total_filtered}
                                        <span className="text-gray-600 text-sm font-normal ml-1">/ {campaign.total_scraped || 0}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Batches</p>
                                    <p className="text-lg font-semibold text-white">
                                        {campaign.completed_batches || 0}
                                        <span className="text-gray-600 text-sm font-normal ml-1">/ {campaign.total_batches || 0}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
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
