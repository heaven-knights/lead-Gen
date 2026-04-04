
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Loader2,
    Send,
    CheckCircle2,
    AlertTriangle,
    X
} from 'lucide-react';

export default function SendingProgress({ campaignId, onComplete }) {
    const [activeBatch, setActiveBatch] = useState(null);
    const [progress, setProgress] = useState(0);
    const [stats, setStats] = useState({ sent: 0, failed: 0, total: 0 });
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        // Initial fetch
        fetchActiveBatch();

        // Subscribe to realtime updates for this campaign
        const subscription = supabase
            .channel(`campaign-${campaignId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'email_messages',
                filter: `campaign_id=eq.${campaignId}`
            }, (payload) => {
                // Simple strategy: re-fetch on any change
                fetchActiveBatch();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [campaignId]);

    const fetchActiveBatch = async () => {
        try {
            // Find the currently sending or scheduled batch
            const { data: batches } = await supabase
                .from('batches')
                .select('*')
                .eq('campaign_id', campaignId)
                .in('status', ['sending', 'scheduled'])
                .order('batch_number', { ascending: true })
                .limit(1);

            if (batches && batches.length > 0) {
                const batch = batches[0];
                setActiveBatch(batch);

                // Fetch specific message stats for this batch
                const { count: sentCount } = await supabase
                    .from('email_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('batch_id', batch.id)
                    .eq('status', 'sent');

                const { count: failedCount } = await supabase
                    .from('email_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('batch_id', batch.id)
                    .eq('status', 'failed');

                const total = batch.lead_count || 0;
                const processed = (sentCount || 0) + (failedCount || 0);

                setStats({
                    sent: sentCount || 0,
                    failed: failedCount || 0,
                    total: total
                });

                // Update progress
                const percent = total > 0 ? Math.round((processed / total) * 100) : 0;
                setProgress(percent);

                // Check if finished
                if (processed >= total && total > 0) {
                    setShowPopup(true);
                    // In a real app, backend would update batch status to 'completed'
                }
            } else {
                // No active batch found, maybe completed?
                setActiveBatch(null);
            }
        } catch (err) {
            console.error('Error fetching progress:', err);
        }
    };

    const handleClosePopup = () => {
        setShowPopup(false);
        if (onComplete) onComplete();
    };

    if (!activeBatch) return null; // Or return "All batches completed" message

    return (
        <div className="bg-gray-900 border border-blue-900/50 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            {/* Background Animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 animate-shimmer"></div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-900/30 rounded-lg animate-pulse">
                        <Send className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Sending Batch #{activeBatch.batch_number}</h3>
                        <p className="text-gray-400 text-sm">Processing leads...</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-mono text-white tracking-widest">{progress}%</p>
                    <p className="text-xs text-blue-400 font-medium uppercase">Progress</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden mb-6 border border-gray-700">
                <div
                    className="h-full bg-gradient-to-r from-blue-600 to-purple-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 border-t border-gray-800/50 pt-4">
                <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase mb-1">Sent</p>
                    <div className="flex items-center justify-center gap-1.5 text-green-400 font-bold text-lg">
                        <CheckCircle2 className="h-4 w-4" />
                        {stats.sent}
                    </div>
                </div>
                <div className="text-center border-l border-r border-gray-800/50">
                    <p className="text-xs text-gray-500 uppercase mb-1">Failed</p>
                    <div className="flex items-center justify-center gap-1.5 text-red-400 font-bold text-lg">
                        <AlertTriangle className="h-4 w-4" />
                        {stats.failed}
                    </div>
                </div>
                <div className="text-center">
                    <p className="text-xs text-gray-500 uppercase mb-1">Remaining</p>
                    <p className="text-white font-bold text-lg">{stats.total - stats.sent - stats.failed}</p>
                </div>
            </div>

            {/* Completion Popup Modal */}
            {showPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <div className="bg-gray-900 border border-green-500/30 p-8 rounded-3xl max-w-md w-full shadow-2xl relative text-center mx-4">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                            <CheckCircle2 className="h-10 w-10 text-green-500" />
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-2">Batch Completed!</h2>
                        <p className="text-gray-400 mb-8 text-lg">
                            Successfully processed <span className="text-white font-bold">{stats.sent}</span> emails.
                        </p>

                        <button
                            onClick={handleClosePopup}
                            className="w-full bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-100 transition-transform active:scale-95 shadow-lg shadow-white/10"
                        >
                            Awesome, Close
                        </button>

                        {/* Confetti or decorative elements could go here */}
                    </div>
                </div>
            )}
        </div>
    );
}
