
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    MessageSquare,
    Search,
    CornerUpLeft,
    ChevronLeft,
    Clock,
    User,
    ArrowLeft
} from 'lucide-react';

export default function ReplyInbox({ initialCampaignId = null }) {
    const [campaigns, setCampaigns] = useState([]);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('campaigns'); // 'campaigns' | 'replies' | 'thread'
    const [selectedCampaignId, setSelectedCampaignId] = useState(initialCampaignId);
    const [selectedReply, setSelectedReply] = useState(null);

    useEffect(() => {
        if (initialCampaignId) {
            setSelectedCampaignId(initialCampaignId);
            setViewMode('replies');
        }
        fetchData();

        // Real-time subscription for global replies
        const channel = supabase.channel('global-replies')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, (payload) => {
                // Simple re-fetch strategy for consistency
                fetchData();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [initialCampaignId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Campaigns
            const { data: campaignsData } = await supabase
                .from('campaigns')
                .select('id, name')
                .eq('org_id', user.id);

            // 2. Fetch All Replies with Lead info
            const { data: repliesData, error } = await supabase
                .from('replies')
                .select(`
                    *,
                    leads (company_name, primary_email)
                `)
                .order('received_at', { ascending: false });

            if (error) throw error;

            setCampaigns(campaignsData || []);
            setReplies(repliesData || []);
        } catch (err) {
            console.error('Error loading inbox:', err);
        } finally {
            setLoading(false);
        }
    };

    // Derived State
    const campaignsWithCounts = campaigns.map(c => {
        const campaignReplies = replies.filter(r => r.campaign_id === c.id);
        return {
            ...c,
            replyCount: campaignReplies.length,
            latestReply: campaignReplies[0]?.received_at
        };
    }).filter(c => c.replyCount > 0) // Only show campaigns with replies
        .sort((a, b) => new Date(b.latestReply || 0) - new Date(a.latestReply || 0));

    const currentCampaignReplies = selectedCampaignId
        ? replies.filter(r => r.campaign_id === selectedCampaignId)
        : [];

    const currentCampaignName = campaigns.find(c => c.id === selectedCampaignId)?.name;

    // Navigation Handlers
    const handleCampaignClick = (id) => {
        setSelectedCampaignId(id);
        setViewMode('replies');
    };

    const handleReplyClick = (reply) => {
        setSelectedReply(reply);
        setViewMode('thread');
    };

    const handleBackToCampaigns = () => {
        setSelectedCampaignId(null);
        setViewMode('campaigns');
    };

    const handleBackToReplies = () => {
        setSelectedReply(null);
        setViewMode('replies');
    };

    if (loading) return <div className="text-gray-400 p-8 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div></div>;

    // --- VIEW 1: CAMPAIGNS GRID ---
    if (viewMode === 'campaigns') {
        if (campaignsWithCounts.length === 0) {
            return (
                <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-8 w-8 text-gray-600" />
                    </div>
                    <h3 className="text-white font-medium mb-1">No replies yet</h3>
                    <p className="text-gray-500 text-sm">Waiting for responses from any campaign.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignsWithCounts.map(campaign => (
                    <button
                        key={campaign.id}
                        onClick={() => handleCampaignClick(campaign.id)}
                        className="bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/50 p-6 rounded-2xl text-left transition-all group"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                                {campaign.name}
                            </h3>
                            <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs font-bold">
                                {campaign.replyCount}
                            </span>
                        </div>
                        <div className="flex items-center text-gray-500 text-sm">
                            <Clock className="h-3 w-3 mr-2" />
                            Last reply: {new Date(campaign.latestReply).toLocaleDateString()}
                        </div>
                    </button>
                ))}
            </div>
        );
    }

    // --- VIEW 2: REPLY LIST (Full Width Cards) ---
    if (viewMode === 'replies') {
        return (
            <div className="space-y-4">
                {/* Header / Nav */}
                <div className="flex items-center mb-6">
                    <button
                        onClick={handleBackToCampaigns}
                        className="mr-4 p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-white">{currentCampaignName}</h2>
                        <p className="text-gray-500 text-sm">{currentCampaignReplies.length} conversations</p>
                    </div>
                </div>

                {/* List */}
                <div className="space-y-3">
                    {currentCampaignReplies.map(reply => (
                        <button
                            key={reply.id}
                            onClick={() => handleReplyClick(reply)}
                            className="w-full bg-gray-900/40 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/30 p-5 rounded-xl text-left transition-all group flex flex-col sm:flex-row gap-4 sm:items-center"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="text-white font-semibold truncate pr-4">
                                        {reply.leads?.company_name || reply.from_email}
                                    </h3>
                                    <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:block">
                                        {new Date(reply.received_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                                    {reply.content}
                                </p>
                            </div>
                            <div className="hidden sm:flex items-center text-blue-500/0 group-hover:text-blue-500/100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                <ChevronLeft className="h-5 w-5 rotate-180" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // --- VIEW 3: THREAD DETAIL ---
    if (viewMode === 'thread' && selectedReply) {
        return (
            <div className="h-[calc(100vh-200px)] flex flex-col bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center bg-gray-900/60 backdrop-blur-sm">
                    <button
                        onClick={handleBackToReplies}
                        className="mr-4 p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-white">
                            {selectedReply.leads?.company_name || 'Unknown Sender'}
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span className="text-blue-400 font-mono bg-blue-900/10 px-1.5 py-0.5 rounded text-xs">{selectedReply.from_email}</span>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-900/20">
                    {/* Thread History */}
                    {selectedReply.message_thread && Array.isArray(selectedReply.message_thread) ? (
                        selectedReply.message_thread.map((msg, idx) => (
                            <MessageBubble key={idx} message={msg} />
                        ))
                    ) : (
                        <MessageBubble message={{
                            role: 'assistant', // Logic flip: user is prospect
                            content: selectedReply.content,
                            timestamp: selectedReply.received_at,
                            sender: selectedReply.from_email
                        }} />
                    )}
                </div>

                {/* Action Area */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/40 text-center">
                    <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                        <CornerUpLeft className="h-4 w-4" />
                        Reply via main dashboard or email provider
                    </p>
                </div>
            </div>
        );
    }

    return null;
}

// --- Helper Components ---

function MessageBubble({ message }) {
    const isMe = message.role === 'user' || message.direction === 'outbound';

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${isMe
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-none'
                }`}>
                <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{message.content}</p>
                <div className={`text-xs mt-2 flex items-center justify-end gap-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                    {new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && <span className="opacity-70"> • You</span>}
                </div>
            </div>
        </div>
    );
}
