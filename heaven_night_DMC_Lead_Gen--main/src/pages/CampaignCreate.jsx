
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft,
    MapPin,
    Target,
    Users,
    Layers,
    Rocket,
    Loader2
} from 'lucide-react';

export default function CampaignCreate() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        niche: '',
        target_leads: 100,
        batch_size: 5
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'target_leads' || name === 'batch_size' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // 1. Create Campaign in DB
            const { data: campaign, error } = await supabase
                .from('campaigns')
                .insert({
                    org_id: user.id, // Assuming mapping
                    name: formData.name,
                    location: formData.location,
                    niche: formData.niche,
                    target_leads: formData.target_leads,
                    batch_size: formData.batch_size,
                    status: 'scraping' // Immediately set to scraping as per PRD
                })
                .select()
                .single();

            if (error) throw error;

            // 2. Trigger Webhook for Scraping
            const webhookUrl = import.meta.env.VITE_N8N_SCRAPE_WEBHOOK;

            console.log('Attempting to trigger SCRAPE webhook:', webhookUrl); // DEBUG LOG

            // Only trigger if configured and not default
            if (webhookUrl && !webhookUrl.includes('YOUR_')) {
                try {
                    const response = await fetch(webhookUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            campaign_id: campaign.id,
                            name: formData.name,
                            location: formData.location,
                            niche: formData.niche,
                            target_leads: formData.target_leads,
                            batch_size: formData.batch_size,
                            action: 'scrape'
                        })
                    });

                    console.log('Scrape Webhook Response Status:', response.status); // DEBUG LOG

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Scrape Webhook Error Body:', errorText); // DEBUG LOG
                        // Don't throw, just warn so user knows but campaign is created
                        alert(`Campaign created, but scraping failed to start: ${response.status} ${errorText}`);
                    } else {
                        console.log('Scraping started successfully');
                    }

                } catch (webhookError) {
                    console.error('Webhook trigger failed:', webhookError);
                    alert(`Campaign created, but scraping trigger error: ${webhookError.message}`);
                }
            } else {
                console.warn('Scrape webhook URL is missing or default.');
                alert('Scrape webhook URL is not configured.');
            }

            // 3. Navigate to Campaign Overview
            navigate(`/campaigns/${campaign.id}`);

        } catch (err) {
            console.error('Error creating campaign:', err);
            alert('Error creating campaign: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        New Campaign
                    </h1>
                    <p className="text-gray-400">
                        Define your target audience and start the outreach automation.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-gray-900/40 border border-gray-800 rounded-2xl p-8 backdrop-blur-sm space-y-8 shadow-xl">
                <div className="space-y-6">

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                            placeholder="e.g. Summer Outreach - Florists"
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-blue-400" />
                                    Target Location
                                </div>
                            </label>
                            <input
                                type="text"
                                name="location"
                                required
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                                placeholder="e.g. London, UK"
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-purple-400" />
                                    Niche / Topic
                                </div>
                            </label>
                            <input
                                type="text"
                                name="niche"
                                required
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                                placeholder="e.g. Florists"
                                value={formData.niche}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-green-400" />
                                    Leads to Scrape
                                </div>
                            </label>
                            <input
                                type="number"
                                name="target_leads"
                                min="1"
                                required
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                                value={formData.target_leads}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-yellow-400" />
                                    Batch Size
                                </div>
                            </label>
                            <input
                                type="number"
                                name="batch_size"
                                min="1"
                                required
                                className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                                value={formData.batch_size}
                                onChange={handleChange}
                            />
                            <p className="mt-1 text-xs text-gray-500">Number of emails sent per day/batch.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-800">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-900/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-6 w-6 animate-spin" />
                                Initializing Campaign...
                            </>
                        ) : (
                            <>
                                <Rocket className="h-6 w-6" />
                                Start Scraping & Launch
                            </>
                        )}
                    </button>
                    <p className="mt-4 text-center text-sm text-gray-500">
                        Clicking this will immediately trigger the scraping engine.
                    </p>
                </div>
            </form>
        </div>
    );
}
