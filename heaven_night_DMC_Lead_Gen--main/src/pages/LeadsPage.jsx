import { useEffect, useState } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { Search, Loader2, MapPin, Users, ChevronRight, BarChart3, Trash2, AlertCircle } from 'lucide-react';

export default function LeadsPage() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');


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

        const channel = supabase
            .channel('leads-page-campaigns')
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
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchCampaigns = async () => {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCampaigns = campaigns.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'sending': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse';
            case 'scraping': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse';
            default: return 'bg-gray-700/30 text-gray-400 border-gray-700/50';
        }
    };

    const confirmDeleteCampaign = (e, id) => {
        e.preventDefault();
        e.stopPropagation();

        setConfirmationModal({
            isOpen: true,
            title: 'Delete Campaign',
            message: 'Are you sure you want to delete this campaign? This action cannot be undone and all associated leads will be hidden.',
            confirmText: 'Delete Campaign',
            isDestructive: true,
            onConfirm: () => handleDelete(id)
        });
    };

    const handleDelete = async (id) => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));
        try {
            // Hard delete: Delete leads first
            const { error: leadsError } = await supabase
                .from('leads')
                .delete()
                .eq('campaign_id', id);

            if (leadsError) throw leadsError;

            // Then delete campaign
            const { error: campaignError } = await supabase
                .from('campaigns')
                .delete()
                .eq('id', id);

            if (campaignError) throw campaignError;

            toast.success('Campaign and associated data deleted permanently');
            closeConfirmationModal();
            fetchCampaigns();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('Error deleting campaign: ' + err.message);
            closeConfirmationModal();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        Leads Automation
                    </h1>
                    <p className="text-gray-400">
                        Select a campaign to view and manage its leads.
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search campaigns..."
                    className="w-full bg-gray-900/40 border border-gray-800 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500 h-8 w-8" /></div>
            ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
                    <div className="bg-gray-800/50 p-4 rounded-full inline-flex mb-4">
                        <BarChart3 className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-medium text-white mb-2">No campaigns found</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">Create a new campaign to start scraping leads.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredCampaigns.map((campaign) => (
                        <div
                            key={campaign.id}
                            onClick={() => navigate(`/leads/${campaign.id}`)}
                            className="group relative bg-gray-900/40 border border-gray-800 hover:border-gray-700 p-6 rounded-2xl transition-all hover:bg-gray-900/60 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col h-full cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                                    {campaign.status.toUpperCase()}
                                </div>
                                <button
                                    onClick={(e) => confirmDeleteCampaign(e, campaign.id)}
                                    className="text-gray-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Delete Campaign"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                {campaign.name}
                            </h3>

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
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Leads</p>
                                    <p className="text-lg font-semibold text-white">
                                        {campaign.total_filtered}
                                        <span className="text-gray-600 text-sm font-normal ml-1">/ {campaign.total_scraped || 0}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Batches</p>
                                    <p className="text-lg font-semibold text-white">
                                        {campaign.total_batches || 0}
                                    </p>
                                </div>
                            </div>

                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 pointer-events-none">
                                <ChevronRight className="h-5 w-5 text-blue-400" />
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
