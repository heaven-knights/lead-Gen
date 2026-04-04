import ReplyInbox from '../components/ReplyInbox';

export default function ReplyPage() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        Reply Inbox
                    </h1>
                    <p className="text-gray-400">
                        Manage responses from all your campaigns in one place.
                    </p>
                </div>
            </div>

            <ReplyInbox campaignId={null} /> {/* Pass null to fetch all replies if component supports it, or modify component */}
        </div>
    );
}
