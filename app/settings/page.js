import TopNav from "../../components/TopNav";
import SettingsStorage from "../../components/SettingsStorage";
import SavedClubsPanel from "../../components/SavedClubsPanel";
import GoogleCalendarSyncPanel from "../../components/GoogleCalendarSyncPanel";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-3xl mx-auto">
        <TopNav />

        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-zinc-400 mb-8">
          Manage your travel cost settings, saved clubs, and calendar sync here.
        </p>

        <div className="space-y-8">
          <SettingsStorage />
          <GoogleCalendarSyncPanel />
          <SavedClubsPanel />
        </div>
      </div>
    </main>
  );
}