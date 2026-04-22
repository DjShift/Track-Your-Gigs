export default function SettingsPanel({ costPerKm, setCostPerKm }) {
  return (
    <div className="app-panel border border-zinc-800 rounded-2xl p-6 mb-8">
      <h2 className="text-2xl font-semibold mb-4">Settings</h2>

      <div>
        <label className="block mb-1 text-sm text-zinc-300">
          Cost per km (€)
        </label>

        <input
          type="number"
          step="0.01"
          value={costPerKm}
          onChange={(e) => setCostPerKm(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2 text-white"
        />
      </div>
    </div>
  );
}