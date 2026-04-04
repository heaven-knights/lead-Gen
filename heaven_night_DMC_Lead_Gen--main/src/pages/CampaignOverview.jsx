
import { useEffect, useState } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import SendingProgress from '../components/SendingProgress';
import ReplyInbox from '../components/ReplyInbox';
import {
    Loader2,
    ArrowLeft,
    Calendar,
    Users,
    Play,
    Clock,
    CheckCircle2,
    AlertTriangle,
    ChevronRight,
    RotateCw
} from 'lucide-react';

export default function CampaignOverview() {
    const { id } = useParams();
    const [campaign, setCampaign] = useState(null);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasReplies, setHasReplies] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplates, setSelectedTemplates] = useState({});
    const [activeTab, setActiveTab] = useState('batches');

    // Safe calculation for usage in effects (campaign might be null initially)
    const showReplyPhase = hasReplies || (campaign?.status === 'completed');

    useEffect(() => {
        fetchTemplates();
        fetchCampaignData();
    }, [id]);

    // Switch to replies tab automatically if we are in reply phase and it's the first load
    useEffect(() => {
        if (showReplyPhase && activeTab === 'batches') {
            const hasSeenTab = localStorage.getItem(`campaign_${id}_tab`);
            if (!hasSeenTab) {
                setActiveTab('replies');
                localStorage.setItem(`campaign_${id}_tab`, 'true');
            }
        }
    }, [showReplyPhase, id]);

    const fetchTemplates = async () => {
        try {
            const { data, error } = await supabase.from('email_templates').select('*');
            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Error fetching templates:', err);
            setTemplates([]);
        }
    };

    const [sentCount, setSentCount] = useState(0);

    const fetchCampaignData = async () => {
        try {
            const { data: campaignData, error: campaignError } = await supabase
                .from('campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (campaignError) throw campaignError;
            setCampaign(campaignData);

            // Check for replies
            const { count } = await supabase
                .from('replies')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', id);

            setHasReplies(count > 0);

            // Fetch Sent Count
            const { count: sCount } = await supabase
                .from('email_messages')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_id', id)
                .eq('status', 'sent');

            setSentCount(sCount || 0);

            setSentCount(sCount || 0);
            setLoading(false);

            // Separate batch fetching
            fetchBatches();

        } catch (err) {
            console.error('Error fetching data:', err);
            setLoading(false);
        }
    };

    const fetchBatches = async () => {
        const { data: batchData, error: batchError } = await supabase
            .from('batches')
            .select('*')
            .eq('campaign_id', id)
            .order('batch_number', { ascending: true });

        if (batchError) {
            console.error('Error fetching batches:', batchError);
        } else {
            setBatches(batchData || []);
        }
    };

    // Real-time updates
    useEffect(() => {
        // Batches
        const batchChannel = supabase
            .channel(`campaign-batches-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'batches',
                    filter: `campaign_id=eq.${id}`
                },
                (payload) => {
                    fetchBatches();
                }
            )
            .subscribe();

        // Campaign Status & Stats
        const campaignChannel = supabase
            .channel(`campaign-overview-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'campaigns',
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    setCampaign(payload.new);
                }
            )
            .subscribe();

        // Email Sent Count
        const emailChannel = supabase
            .channel(`campaign-emails-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'email_messages',
                    filter: `campaign_id=eq.${id}`
                },
                () => {
                    // Refetch simple count
                    updateSentCount();
                    // Also refresh batches as email status changes might affect batch status logic if handled by triggers
                    fetchBatches();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(batchChannel);
            supabase.removeChannel(campaignChannel);
            supabase.removeChannel(emailChannel);
        };
    }, [id]);

    const updateSentCount = async () => {
        const { count } = await supabase
            .from('email_messages')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', id)
            .eq('status', 'sent');
        setSentCount(count || 0);
    };




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

    const [generatingBatches, setGeneratingBatches] = useState(false);
    const [sendingBatchId, setSendingBatchId] = useState(null);

    const handleGenerateBatches = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Generate Batches',
            message: 'Are you sure you want to generate batches for this campaign? This action logic creates batches from unassigned leads.',
            confirmText: 'Generate Batches',
            isDestructive: false,
            onConfirm: performGenerateBatches
        });
    };

    const performGenerateBatches = async () => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));

        setGeneratingBatches(true);
        try {
            // 1. Get all unassigned leads
            const { data: leads, error: leadsError } = await supabase
                .from('leads')
                .select('id')
                .eq('campaign_id', id)
                .is('batch_id', null);

            if (leadsError) throw leadsError;

            if (!leads || leads.length === 0) {
                alert('No pending leads found to batch.');
                setGeneratingBatches(false);
                return;
            }

            // 2. Calculate batches
            const batchSize = campaign.batch_size || 5;
            const totalBatches = Math.ceil(leads.length / batchSize);
            const newBatches = [];

            // 3. Create Batch Records
            for (let i = 0; i < totalBatches; i++) {
                const batchNum = (batches.length || 0) + i + 1;
                newBatches.push({
                    campaign_id: id,
                    org_id: campaign.org_id,
                    batch_number: batchNum,
                    status: 'pending',
                    lead_count: 0 // Will update later or ignore
                });
            }

            const { data: createdBatches, error: createError } = await supabase
                .from('batches')
                .insert(newBatches)
                .select();

            if (createError) throw createError;

            // 4. Assign leads to batches
            let leadIndex = 0;
            for (const batch of createdBatches) {
                const batchLeads = leads.slice(leadIndex, leadIndex + batchSize);
                if (batchLeads.length === 0) break;

                const batchLeadIds = batchLeads.map(l => l.id);

                // Update leads
                const { error: assignError } = await supabase
                    .from('leads')
                    .update({ batch_id: batch.id })
                    .in('id', batchLeadIds);

                if (assignError) throw assignError;

                // Update batch lead count
                await supabase
                    .from('batches')
                    .update({ lead_count: batchLeads.length })
                    .eq('id', batch.id);

                leadIndex += batchSize;
            }

            // 5. Update campaign total_batches
            await supabase
                .from('campaigns')
                .update({ total_batches: (campaign.total_batches || 0) + createdBatches.length })
                .eq('id', id);

            toast.success(`Successfully generated ${createdBatches.length} batches!`);
            fetchCampaignData();

        } catch (err) {
            console.error('Error generating batches:', err);
            toast.error('Failed to generate batches: ' + err.message);
        } finally {
            setGeneratingBatches(false);
            closeConfirmationModal();
        }
    };

    const handleSendBatch = async (e, batchId) => {
        e.preventDefault();
        e.stopPropagation();

        if (!selectedTemplates[batchId]) {
            toast.error('Please select an email template first');
            return;
        }

        const template = templates.find(t => t.id === selectedTemplates[batchId]);

        setConfirmationModal({
            isOpen: true,
            title: 'Send Batch Email',
            message: `Are you sure you want to send this batch using the template "${template.name}"?`,
            confirmText: 'Send Email',
            isDestructive: false,
            onConfirm: () => performSendBatch(batchId, template)
        });
    };

    const performSendBatch = async (batchId, template) => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));

        setSendingBatchId(batchId);
        try {
            // 1. Update Batch Status locally
            const { error: updateError } = await supabase
                .from('batches')
                .update({ status: 'sending' })
                .eq('id', batchId);

            if (updateError) throw updateError;

            // 2. Trigger Webhook
            const webhookUrl = import.meta.env.VITE_N8N_SEND_WEBHOOK;

            console.log('Attempting to trigger webhook:', webhookUrl); // DEBUG LOG

            if (!webhookUrl) {
                console.error('Webhook URL is missing!'); // DEBUG LOG
                throw new Error('Send Webhook URL not configured in .env');
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaign_id: id,
                    batch_id: batchId,
                    action: 'send',
                    template_id: template.id,
                    template_type: template.type,
                    attachments: template.attachments || [],
                    subject: template.subject,
                    body: template.body,
                    intro_text: template.intro_text,
                    outro_text: template.outro_text,
                    main_image_url: template.main_image_url,
                    redirect_url: template.redirect_url
                })
            });

            console.log('Webhook Response Status:', response.status); // DEBUG LOG

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Webhook Error Body:', errorText); // DEBUG LOG
                throw new Error(`Webhook failed: ${response.status} ${errorText}`);
            }

            toast.success('Batch sending started successfully!');
            fetchCampaignData(); // Refresh to see updated status

        } catch (err) {
            console.error('Error sending batch:', err);
            toast.error('Failed to send batch: ' + err.message);

            // Revert status on failure
            await supabase
                .from('batches')
                .update({ status: 'failed' })
                .eq('id', batchId);

        } finally {
            setSendingBatchId(null);
            closeConfirmationModal();
        }
    };

    const handleStopBatch = (e, batchId) => {
        e.preventDefault();
        e.stopPropagation();

        setConfirmationModal({
            isOpen: true,
            title: 'Stop Sending Batch',
            message: 'Are you sure you want to stop this batch? This will halt any pending emails.',
            confirmText: 'Stop Batch',
            isDestructive: true,
            onConfirm: () => performStopBatch(batchId)
        });
    };

    const performStopBatch = async (batchId) => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));

        try {
            const { error: updateError } = await supabase
                .from('batches')
                .update({ status: 'pending' }) // Revert to pending or failed
                .eq('id', batchId);

            if (updateError) throw updateError;

            toast.success('Batch stopped successfully!');
            fetchCampaignData();

        } catch (err) {
            console.error('Error stopping batch:', err);
            toast.error('Failed to stop batch: ' + err.message);
        } finally {
            closeConfirmationModal();
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-gray-700 text-gray-300',
            scheduled: 'bg-blue-900/50 text-blue-300 border-blue-800',
            sending: 'bg-yellow-900/50 text-yellow-300 border-yellow-800 animate-pulse',
            completed: 'bg-green-900/50 text-green-300 border-green-800',
            failed: 'bg-red-900/50 text-red-300 border-red-800'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending} uppercase tracking-wider`}>
                {status}
            </span>
        );
    };

    // Auto-refresh when scraping
    useEffect(() => {
        let interval;
        if (campaign?.status === 'scraping') {
            interval = setInterval(fetchCampaignData, 5000); // Poll every 5 seconds
        }
        return () => clearInterval(interval);
    }, [campaign?.status]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500 h-8 w-8" /></div>;
    if (!campaign) return <div className="text-white p-10">Campaign not found</div>;

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* ... Header ... */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">{campaign.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {campaign.niche}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                            <span>{campaign.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Target Leads</h3>
                    <p className="text-2xl font-bold text-white">{campaign.target_leads}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Scraped</h3>
                    <p className="text-2xl font-bold text-white">{campaign.total_scraped || 0}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Filtered (Valid)</h3>
                    <p className="text-2xl font-bold text-blue-400">{campaign.total_filtered || 0}</p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Batches</h3>
                    <p className="text-2xl font-bold text-white">
                        {batches.filter(b => b.status === 'completed').length}
                        <span className="text-gray-600 text-sm font-normal ml-1">/ {Math.max(campaign.total_batches || 0, batches.length)}</span>
                    </p>
                </div>
                <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl backdrop-blur-sm">
                    <h3 className="text-gray-400 text-sm font-medium mb-1">Sent</h3>
                    <p className="text-2xl font-bold text-green-400">{sentCount}</p>
                </div>
            </div>

            {/* Sending Progress Section */}
            {campaign.status === 'sending' && (
                <div className="mb-8">
                    <SendingProgress campaignId={id} onComplete={fetchCampaignData} />
                </div>
            )}

            {/* Main Content Area */}
            {campaign.status === 'scraping' ? (
                /* Scraping In Progress State */
                <div className="bg-gray-900/40 border border-purple-500/20 rounded-2xl overflow-hidden backdrop-blur-sm p-12 text-center">
                    <div className="relative mx-auto mb-6 w-24 h-24 flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <Loader2 className="h-10 w-10 text-purple-400 animate-pulse" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2">Scraping in Progress</h2>
                    <p className="text-gray-400 max-w-md mx-auto mb-8">
                        Our engine is currently finding and verifying leads for <strong>{campaign.niche}</strong> in <strong>{campaign.location}</strong>.
                    </p>

                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-200">
                        <Users className="h-5 w-5" />
                        <span className="font-mono text-xl font-bold">{campaign.total_filtered || 0}</span>
                        <span className="text-sm opacity-80">filtered leads found so far</span>
                    </div>

                    <p className="text-xs text-gray-500 mt-6">
                        The page will automatically update as leads are found.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-6 border-b border-gray-800">
                        <button
                            onClick={() => setActiveTab('batches')}
                            className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'batches' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Batches
                            {activeTab === 'batches' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('replies')}
                            className={`pb-4 px-2 text-sm font-medium transition-all relative ${activeTab === 'replies' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Reply Inbox
                            {hasReplies && <span className="ml-2 bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">New</span>}
                            {activeTab === 'replies' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full"></div>}
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'replies' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <ReplyInbox initialCampaignId={id} />
                        </div>
                    ) : (
                        /* Batches Section */
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">Batch Schedule</h3>
                                <div className="text-sm text-gray-500 bg-gray-900/40 px-3 py-1.5 rounded-lg border border-gray-800">
                                    Batch Size: <span className="text-white font-medium">{campaign.batch_size}</span>
                                </div>
                            </div>

                            {batches.length === 0 ? (
                                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center backdrop-blur-sm">
                                    {campaign.total_filtered > 0 ? (
                                        <>
                                            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
                                            <p className="text-white font-medium">Scraping Completed!</p>
                                            <p className="mb-4 text-gray-400">Found {campaign.total_filtered} valid leads.</p>
                                            <p className="text-xs text-gray-500 mb-6">Batches have not been generated yet.</p>

                                            <button
                                                onClick={handleGenerateBatches}
                                                disabled={generatingBatches}
                                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {generatingBatches ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                                Generate Batches Now
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="h-10 w-10 mx-auto mb-3 text-gray-600" />
                                            <p className="text-gray-400">No batches generated yet.</p>
                                            <p className="text-xs mt-1 text-gray-500">Batches will appear once scraping and filtration are complete.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {batches.map((batch) => (
                                        <Link
                                            key={batch.id}
                                            to={`/campaigns/${id}/batches/${batch.id}`}
                                            className="group relative bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 p-6 rounded-2xl transition-all hover:bg-gray-900/60 hover:shadow-xl hover:shadow-blue-900/10 flex flex-col"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="h-10 w-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-300 font-bold border border-gray-700 group-hover:border-blue-500/30 group-hover:text-blue-400 transition-colors">
                                                    {batch.batch_number}
                                                </div>
                                                {getStatusBadge(batch.status)}
                                            </div>

                                            <div className="mt-auto space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 text-sm">Leads</span>
                                                    <span className="text-white font-semibold flex items-center gap-1.5">
                                                        <Users className="h-4 w-4 text-gray-500" />
                                                        {batch.lead_count}
                                                    </span>
                                                </div>

                                                {(batch.status === 'pending' || batch.status === 'failed' || batch.status === 'completed') && (
                                                    <div className="mt-4">
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">Email Template</label>
                                                        <select
                                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                                            value={selectedTemplates[batch.id] || ''}
                                                            onChange={(e) => {
                                                                e.preventDefault();
                                                                setSelectedTemplates(prev => ({ ...prev, [batch.id]: e.target.value }));
                                                            }}
                                                            onClick={(e) => e.preventDefault()}
                                                        >
                                                            <option value="">Select a template...</option>
                                                            {templates.map(t => (
                                                                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {(batch.status === 'pending' || batch.status === 'failed') && (
                                                    <button
                                                        onClick={(e) => handleSendBatch(e, batch.id)}
                                                        className="w-full mt-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors z-10 relative"
                                                    >
                                                        <Play className="h-4 w-4 fill-current" />
                                                        Send Email
                                                    </button>
                                                )}

                                                {batch.status === 'completed' && (
                                                    <button
                                                        onClick={(e) => handleSendBatch(e, batch.id)}
                                                        className="w-full mt-3 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 px-4 py-2 rounded-lg font-medium transition-colors z-10 relative"
                                                    >
                                                        <RotateCw className="h-4 w-4" />
                                                        Resend Email
                                                    </button>
                                                )}

                                                {batch.status === 'sending' && (
                                                    <button
                                                        onClick={(e) => handleStopBatch(e, batch.id)}
                                                        className="w-full mt-3 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors z-10 relative"
                                                    >
                                                        <AlertTriangle className="h-4 w-4 fill-current" />
                                                        Stop Sending
                                                    </button>
                                                )}

                                                {batch.scheduled_for && (
                                                    <div className="flex items-center justify-between border-t border-gray-800 pt-3 mt-3">
                                                        <span className="text-gray-500 text-xs">Scheduled</span>
                                                        <span className="text-gray-300 text-xs flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {new Date(batch.scheduled_for).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                                <ChevronRight className="h-5 w-5 text-blue-400" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
