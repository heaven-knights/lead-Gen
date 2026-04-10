import { useEffect, useState } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { toast } from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Loader2,
    ArrowLeft,
    Building2,
    Mail,
    Phone,
    Globe,
    MapPin,
    Filter
} from 'lucide-react';

export default function BatchDetail() {
    const { id: campaignId, batchId } = useParams();
    const navigate = useNavigate();
    const [batch, setBatch] = useState(null);
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [filterWithPhone, setFilterWithPhone] = useState(false);
    const [filterWithoutEmail, setFilterWithoutEmail] = useState(false);

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
        fetchBatchData();
    }, [batchId]);

    const fetchBatchData = async () => {
        try {
            const { data: batchData, error: batchError } = await supabase
                .from('batches')
                .select('*')
                .eq('id', batchId)
                .single();

            if (batchError) throw batchError;
            setBatch(batchData);

            // Fetch Leads
            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('*')
                .eq('batch_id', batchId);

            if (leadsError) throw leadsError;

            // Fetch Email Messages to determine status
            const { data: emailsData, error: emailsError } = await supabase
                .from('email_messages')
                .select('lead_id, status, sent_at')
                .eq('batch_id', batchId);

            if (emailsError) {
                console.error('Error fetching emails:', emailsError);
            }

            // Fetch Replies to determine if any lead replied (Phase 2 logic)
            const { data: repliesData, error: repliesError } = await supabase
                .from('replies')
                .select('lead_id')
                .eq('campaign_id', campaignId); // Replies are linked to campaign

            if (repliesError) {
                console.error('Error fetching replies:', repliesError);
            }

            // Map status to leads with priority: Replied > Sent/Failed/Queued > Pending
            const leadsWithStatus = (leadsData || []).map(lead => {
                const email = emailsData?.find(e => e.lead_id === lead.id);
                const hasReply = repliesData?.some(r => r.lead_id === lead.id);

                let status = 'pending';
                if (hasReply) {
                    status = 'replied';
                } else if (email?.status) {
                    status = email.status;
                }

                return {
                    ...lead,
                    email_status: status,
                    sent_at: email?.sent_at
                };
            });

            setLeads(leadsWithStatus);


            setLoading(false);

        } catch (err) {
            console.error('Error fetching batch details:', err);
            setLoading(false);
        }
    };

    // Real-time updates
    useEffect(() => {
        // 1. Listen for Batch Status changes (e.g. pending -> sending -> completed)
        const batchChannel = supabase
            .channel(`batch-detail-${batchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'batches',
                    filter: `id=eq.${batchId}`
                },
                (payload) => {
                    fetchBatchData();
                }
            )
            .subscribe();

        // 2. Listen for Email statuses (queue -> sent)
        const emailChannel = supabase
            .channel(`batch-emails-${batchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERTs (new log) and UPDATEs (status change)
                    schema: 'public',
                    table: 'email_messages',
                    filter: `batch_id=eq.${batchId}`
                },
                () => {
                    // Refetch to re-calculate lead statuses safely
                    fetchBatchData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(batchChannel);
            supabase.removeChannel(emailChannel);
        };
    }, [batchId]);

    const handleSendBatch = () => {
        setConfirmationModal({
            isOpen: true,
            title: 'Send Batch Emails',
            message: `Are you sure you want to send emails to ${leads.length} leads in this batch?`,
            confirmText: 'Send Emails',
            isDestructive: false,
            onConfirm: performSendBatch
        });
    };

    const performSendBatch = async () => {
        setConfirmationModal(prev => ({ ...prev, isLoading: true }));

        setSending(true);
        try {
            // 1. Update Batch Status locally
            const { error: updateError } = await supabase
                .from('batches')
                .update({ status: 'sending' })
                .eq('id', batchId);

            if (updateError) throw updateError;

            // 2. Trigger Webhook
            const webhookUrl = import.meta.env.VITE_N8N_SEND_WEBHOOK;

            if (!webhookUrl) {
                throw new Error('Send Webhook URL not configured');
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaign_id: campaignId,
                    batch_id: batchId,
                    action: 'send'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Webhook failed: ${response.status} ${errorText}`);
            }

            toast.success('Batch sending started successfully!');
            fetchBatchData(); // Refresh to see updated status
            closeConfirmationModal();

        } catch (err) {
            console.error('Error starting batch:', err);
            toast.error('Error starting batch: ' + err.message);
            closeConfirmationModal();

            // Revert status on failure
            await supabase
                .from('batches')
                .update({ status: 'failed' })
                .eq('id', batchId);

        } finally {
            setSending(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'replied': return 'bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse';
            case 'sent': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'queued': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            default: return 'bg-gray-800 text-gray-300 border-gray-700';
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-500" /></div>;
    if (!batch) return <div className="text-white p-10">Batch not found</div>;

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={() => navigate(`/campaigns/${campaignId}`)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Batch #{batch.batch_number}</h1>
                        <p className="text-gray-400 text-sm">Reviewing leads in this batch</p>
                    </div>
                </div>

                <div className="flex flex-col items-start md:flex-row md:items-center gap-4 w-full md:w-auto pl-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${batch.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        batch.status === 'sending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse' :
                            'bg-gray-800 text-gray-300 border-gray-700'
                        } uppercase`}>
                        {batch.status}
                    </span>

                    {(batch.status === 'pending' || batch.status === 'scheduled' || batch.status === 'failed') && (
                        <button
                            onClick={handleSendBatch}
                            disabled={sending}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center md:justify-start"
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                            Send Emails
                        </button>
                    )}
                </div>
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
                    {leads.filter(lead => {
                        const matchesPhone = !filterWithPhone || (lead.primary_phone && lead.primary_phone.trim() !== '');
                        const matchesNoEmail = !filterWithoutEmail || (!lead.primary_email || lead.primary_email.trim() === '');
                        return matchesPhone && matchesNoEmail;
                    }).length} of {leads.length} leads
                </span>
            </div>

            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-800 bg-gray-900/50">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Website</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {leads.filter(lead => {
                                const matchesPhone = !filterWithPhone || (lead.primary_phone && lead.primary_phone.trim() !== '');
                                const matchesNoEmail = !filterWithoutEmail || (!lead.primary_email || lead.primary_email.trim() === '');
                                return matchesPhone && matchesNoEmail;
                            }).map((lead) => (
                                <tr key={lead.id} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-gray-800 rounded-lg">
                                                <Building2 className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{lead.company_name || 'Unknown Company'}</p>
                                                <div className="flex items-center gap-1 text-xs text-yellow-500 mt-1">
                                                    <span>★ {lead.rating || 'N/A'}</span>
                                                    <span className="text-gray-600">({lead.reviews_count || 0})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.primary_email ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <Mail className="h-4 w-4 text-gray-500" />
                                                {lead.primary_email}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-red-400 bg-red-900/10 px-2 py-0.5 rounded">No Email</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.owner_email ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                                <Mail className="h-4 w-4 text-gray-500" />
                                                {lead.owner_email}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-red-400 bg-red-900/10 px-2 py-0.5 rounded">No Email</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.primary_phone ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <Phone className="h-4 w-4 text-gray-500" />
                                                {lead.primary_phone}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <MapPin className="h-4 w-4 text-gray-600" />
                                            {lead.city}, {lead.country}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize w-fit ${getStatusColor(lead.email_status)}`}>
                                                {lead.email_status}
                                            </span>
                                            {lead.sent_at && (
                                                <span className="text-xs text-gray-500">
                                                    {new Date(lead.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.website ? (
                                            <a
                                                href={lead.website}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
                                            >
                                                <Globe className="h-4 w-4" />
                                                Visit
                                            </a>
                                        ) : (
                                            <span className="text-sm text-gray-600">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {leads.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No leads found in this batch.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4 p-4">
                    {leads.filter(lead => {
                        const matchesPhone = !filterWithPhone || (lead.primary_phone && lead.primary_phone.trim() !== '');
                        const matchesNoEmail = !filterWithoutEmail || (!lead.primary_email || lead.primary_email.trim() === '');
                        return matchesPhone && matchesNoEmail;
                    }).map((lead) => (
                        <div key={lead.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg">
                                        <Building2 className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{lead.company_name || 'Unknown Company'}</p>
                                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                                            <span>★ {lead.rating || 'N/A'}</span>
                                            <span className="text-gray-600">({lead.reviews_count || 0})</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${getStatusColor(lead.email_status)}`}>
                                    {lead.email_status}
                                </span>
                            </div>

                            <div className="space-y-2 text-sm">
                                {lead.primary_email && (
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                        {lead.primary_email}
                                    </div>
                                )}
                                {lead.owner_email && (
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Mail className="h-4 w-4 text-gray-500" />
                                        <span className="text-xs text-gray-500 mr-1">Owner:</span>
                                        {lead.owner_email}
                                    </div>
                                )}
                                {lead.primary_phone && (
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Phone className="h-4 w-4 text-gray-500" />
                                        {lead.primary_phone}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-400">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    {lead.city}, {lead.country}
                                </div>
                            </div>

                            {lead.website && (
                                <div className="pt-2 border-t border-gray-700">
                                    <a
                                        href={lead.website}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-400 hover:underline"
                                    >
                                        <Globe className="h-4 w-4" />
                                        {lead.website.replace(/^https?:\/\//, '')}
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                    {leads.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No leads found in this batch.
                        </div>
                    )}
                </div>
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
        </div>
    );
}
